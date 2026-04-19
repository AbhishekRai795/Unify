// index.mjs
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);

// Helper: Extract user email from JWT token
const getUserEmailFromToken = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decodedPayload = Buffer.from(paddedPayload, 'base64url').toString('utf8');
    const parsed = JSON.parse(decodedPayload);
    return parsed.email || parsed['cognito:username'] || parsed.username;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Helper: Get user by email
const getUserByEmail = async (email) => {
  try {
    const result = await dynamoDB.send(new ScanCommand({
      TableName: 'Unify-Users',
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email }
    }));
    return result.Items?.length > 0 ? result.Items[0] : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

// Helper: Verify user is chapter head
const verifyChapterHead = async (email) => {
  const params = {
    TableName: 'ChapterHead',
    Key: { email }
  };
  try {
    const result = await dynamoDB.send(new GetCommand(params));
    return result.Item;
  } catch (error) {
    console.error('Error verifying chapter head:', error);
    return null;
  }
};

// Helper: Resolve chapterId for chapter head record
const resolveChapterContext = async (chapterHead) => {
  if (!chapterHead) return chapterHead;
  if (chapterHead.chapterId) return chapterHead;
  try {
    if (chapterHead.chapterName) {
      const scanByName = await dynamoDB.send(new ScanCommand({
        TableName: 'Chapters',
        FilterExpression: 'chapterName = :n',
        ExpressionAttributeValues: { ':n': chapterHead.chapterName }
      }));
      if (scanByName.Items?.length > 0) {
        return { ...chapterHead, chapterId: scanByName.Items[0].chapterId };
      }
    }
    if (Array.isArray(chapterHead.chapters) && chapterHead.chapters.length > 0) {
      const first = chapterHead.chapters;
      const getTry = await dynamoDB.send(new GetCommand({ TableName: 'Chapters', Key: { chapterId: first } }));
      if (getTry.Item) {
        return { ...chapterHead, chapterId: getTry.Item.chapterId, chapterName: getTry.Item.chapterName };
      }
      const scanByFirstName = await dynamoDB.send(new ScanCommand({
        TableName: 'Chapters',
        FilterExpression: 'chapterName = :n',
        ExpressionAttributeValues: { ':n': first }
      }));
      if (scanByFirstName.Items?.length > 0) {
        return { ...chapterHead, chapterId: scanByFirstName.Items[0].chapterId, chapterName: scanByFirstName.Items.chapterName };
      }
    }
  } catch (err) {
    console.log('Error resolving chapter context:', err.message);
  }
  return chapterHead;
};

// Helper: Check if user is member of chapter
const isUserMemberOfChapter = async (userId, chapterId) => {
  try {
    const result = await dynamoDB.send(new ScanCommand({
      TableName: 'RegistrationRequests',
      FilterExpression: 'userId = :userId AND chapterId = :chapterId AND #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':userId': userId,
        ':chapterId': chapterId,
        ':status': 'approved'
      }
    }));
    return result.Items && result.Items.length > 0;
  } catch (error) {
    console.error('Error checking membership:', error);
    return false;
  }
};

// GET: chapters managed by the current head
const getMyChapters = async (chapterHead, headers) => {
  try {
    const params = { TableName: 'Chapters', Key: { chapterId: chapterHead.chapterId } };
    const result = await dynamoDB.send(new GetCommand(params));
    const chapter = result.Item;
    if (!chapter) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Chapter not found' }) };
    }

    let approvedMemberCount = chapter.memberCount || 0;
    try {
      const approvedResult = await dynamoDB.send(new ScanCommand({
        TableName: 'RegistrationRequests',
        FilterExpression: 'chapterId = :c AND #status = :s',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':c': chapterHead.chapterId, ':s': 'approved' }
      }));
      approvedMemberCount = approvedResult.Items ? approvedResult.Items.length : 0;
    } catch (err) {
      console.log('Approved registrations scan issue:', err.message);
    }

    const responseChapter = {
      chapterId: chapter.chapterId,
      chapterName: chapter.chapterName,
      createdAt: chapter.createdAt || null,
      headEmail: chapter.headEmail,
      headName: chapter.headName,
      memberCount: approvedMemberCount,
      status: chapter.status || 'active',
      updatedAt: chapter.updatedAt || null,
      registrationStatus: chapter.registrationOpen ? 'open' : 'closed'
    };
    return { statusCode: 200, headers, body: JSON.stringify({ chapters: [responseChapter] }) };
  } catch (error) {
    console.error('Error getting chapters:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch chapters', details: error.message }) };
  }
};

// GET: dashboard statistics
const getDashboardStats = async (chapterHead, headers) => {
  try {
    const chapterResult = await dynamoDB.send(new GetCommand({ TableName: 'Chapters', Key: { chapterId: chapterHead.chapterId } }));
    const chapter = chapterResult.Item || {};
    let pendingCount = 0;
    let approvedCount = 0;
    try {
      const pendingResult = await dynamoDB.send(new ScanCommand({
        TableName: 'RegistrationRequests',
        FilterExpression: 'chapterId = :c AND #status = :s',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':c': chapterHead.chapterId, ':s': 'pending' }
      }));
      pendingCount = pendingResult.Items ? pendingResult.Items.length : 0;
    } catch (err) {
      console.log('Pending scan issue:', err.message);
    }

    const recentApprovedResult = await dynamoDB.send(new ScanCommand({
      TableName: 'RegistrationRequests',
      FilterExpression: 'chapterId = :c AND #status = :s',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':c': chapterHead.chapterId, ':s': 'approved' }
    }));

    approvedCount = recentApprovedResult.Items ? recentApprovedResult.Items.length : 0;
    const recentRegistrations = (recentApprovedResult.Items || []).filter(r => !!r.processedAt).length;

    // Fetch active events count
    let activeEvents = 0;
    try {
      const eventsResult = await dynamoDB.send(new ScanCommand({
        TableName: 'ChapterEvents',
        FilterExpression: 'chapterId = :c AND (isLive = :true OR attribute_not_exists(isLive))',
        ExpressionAttributeValues: { ':c': chapterHead.chapterId, ':true': true }
      }));
      activeEvents = eventsResult.Items ? eventsResult.Items.length : 0;
    } catch (err) {
      console.log('Events scan issue:', err.message);
    }

    const stats = {
      totalChapters: 1,
      totalMembers: approvedCount,
      pendingRegistrations: pendingCount,
      activeEvents,
      recentRegistrations
    };
    return { statusCode: 200, headers, body: JSON.stringify({ stats }) };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch dashboard statistics', details: error.message }) };
  }
};

// GET: registration requests for the chapter head's chapters
const getRegistrations = async (chapterHead, queryParams, headers) => {
  try {
    const result = await dynamoDB.send(new ScanCommand({
      TableName: 'RegistrationRequests',
      FilterExpression: 'chapterId = :c',
      ExpressionAttributeValues: { ':c': chapterHead.chapterId }
    }));
    const registrations = result.Items || [];
    
    // Add membership status to each registration
    const registrationsWithMembership = await Promise.all(
      registrations.map(async (registration) => {
        const isMember = await isUserMemberOfChapter(registration.userId, chapterHead.chapterId);
        return {
          ...registration,
          isMember
        };
      })
    );
    
    return { statusCode: 200, headers, body: JSON.stringify({ registrations: registrationsWithMembership }) };
  } catch (error) {
    console.error('Error getting registrations:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch registrations', details: error.message }) };
  }
};

// GET: registration requests for a specific chapter ID
const getChapterRegistrations = async (chapterHead, chapterId, headers) => {
  if (chapterId !== chapterHead.chapterId) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied to requested chapter' }) };
  }
  return getRegistrations(chapterHead, null, headers);
};

// PUT: open/close registration for chapter
const toggleRegistration = async (chapterHead, body, headers) => {
  try {
    const { chapterId, status } = body;
    if (chapterId !== chapterHead.chapterId) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied. Can only modify your own chapter.' }) };
    }
    const result = await dynamoDB.send(new UpdateCommand({
      TableName: 'Chapters',
      Key: { chapterId },
      UpdateExpression: 'SET registrationOpen = :status, updatedAt = :u',
      ExpressionAttributeValues: { ':status': status === 'open', ':u': new Date().toISOString() },
      ReturnValues: 'ALL_NEW'
    }));
    return { statusCode: 200, headers, body: JSON.stringify({ message: `Registration ${status === 'open' ? 'opened' : 'closed'} successfully`, chapter: result.Attributes }) };
  } catch (error) {
    console.error('Error toggling registration:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to update registration status', details: error.message }) };
  }
};

// PUT: update registration status
const updateRegistrationStatus = async (chapterHead, registrationId, body, headers) => {
  try {
    const { status, notes } = body;
    const params = {
      TableName: 'RegistrationRequests',
      Key: { registrationId },
      UpdateExpression: 'SET #status = :s, processedAt = :pAt, processedBy = :pBy',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':s': status, ':pAt': new Date().toISOString(), ':pBy': chapterHead.email },
      ReturnValues: 'ALL_NEW'
    };
    if (notes) {
      params.UpdateExpression += ', notes = :n';
      params.ExpressionAttributeValues[':n'] = notes;
    }
    const result = await dynamoDB.send(new UpdateCommand(params));
    if (status === 'approved' && result.Attributes && result.Attributes.userId) {
      try {
        // Read existing registeredChapters first (handles both List and StringSet types)
        const userRecord = await dynamoDB.send(new GetCommand({
          TableName: 'Unify-Users',
          Key: { userId: result.Attributes.userId }
        }));
        const existingUser = userRecord.Item || {};
        let existingChapters = [];
        if (existingUser.registeredChapters) {
          if (existingUser.registeredChapters instanceof Set) {
            existingChapters = Array.from(existingUser.registeredChapters);
          } else if (Array.isArray(existingUser.registeredChapters)) {
            existingChapters = existingUser.registeredChapters;
          }
        }
        const chapterName = result.Attributes.chapterName;
        if (!existingChapters.includes(chapterName)) {
          existingChapters.push(chapterName);
        }
        // Write back as a StringSet (DocumentClient sends as SS in DynamoDB)
        await dynamoDB.send(new UpdateCommand({
          TableName: 'Unify-Users',
          Key: { userId: result.Attributes.userId },
          UpdateExpression: 'SET registeredChapters = :chapters, updatedAt = :u',
          ExpressionAttributeValues: {
            ':chapters': existingChapters,  // plain array → L (List) in DynamoDB
            ':u': new Date().toISOString()
          },
          ReturnValues: 'NONE'
        }));
        console.log(`Updated registeredChapters for userId ${result.Attributes.userId}:`, existingChapters);
      } catch (e) {
        console.error('User membership update error:', e.message);
      }
      try {
        await dynamoDB.send(new UpdateCommand({
          TableName: 'Chapters',
          Key: { chapterId: result.Attributes.chapterId },
          UpdateExpression: 'SET memberCount = if_not_exists(memberCount, :zero) + :one, updatedAt = :u',
          ExpressionAttributeValues: { ':one': 1, ':zero': 0, ':u': new Date().toISOString() },
          ReturnValues: 'NONE'
        }));
      } catch (e) {
        console.log('Chapter member count increment issue (non-fatal):', e.message);
      }
      try {
        const timestamp = Date.now();
        const transactionRecord = {
          chapterId: result.Attributes.chapterId,
          transactionId: `TRANSACTION#${timestamp}#MANUAL_${result.Attributes.userId}`,
          recordType: 'TRANSACTION',
          paymentStatus: 'COMPLETED',
          amount: 0,
          currencyCode: 'INR',
          userId: result.Attributes.userId,
          studentName: result.Attributes.studentName || 'Unknown',
          studentEmail: result.Attributes.studentEmail || 'Unknown',
          notes: 'Manually approved by chapter head or free chapter joining',
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        };
        await dynamoDB.send(new PutCommand({
          TableName: 'ChapterPayments',
          Item: transactionRecord
        }));
      } catch (e) {
        console.log('Chapter payment transaction record issue (non-fatal):', e.message);
      }
    }
    return { statusCode: 200, headers, body: JSON.stringify({ message: `Registration ${status} successfully`, registrationId, updatedRegistration: result.Attributes }) };
  } catch (error) {
    console.error('Error updating registration status:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to update registration status', details: error.message }) };
  }
};

// DELETE: Kick student from chapter
const kickStudent = async (chapterHead, body, headers) => {
  try {
    const { studentEmail, reason } = body;

    // Get the student to be kicked
    const student = await getUserByEmail(studentEmail);
    if (!student) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Student not found' })
      };
    }

    // Check if student is actually a member of this chapter
    const isMember = await isUserMemberOfChapter(student.userId, chapterHead.chapterId);
    if (!isMember) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Student is not a member of this chapter' })
      };
    }

    // Get chapter details
    const chapterResult = await dynamoDB.send(new GetCommand({
      TableName: 'Chapters',
      Key: { chapterId: chapterHead.chapterId }
    }));
    const chapter = chapterResult.Item;

    // Remove student from registeredChapters in Users table
    const currentChapters = student.registeredChapters ? Array.from(student.registeredChapters) : [];
    const updatedChapters = currentChapters.filter(name => name !== chapter.chapterName);

    await dynamoDB.send(new UpdateCommand({
      TableName: 'Unify-Users',
      Key: { userId: student.userId },
      UpdateExpression: 'SET registeredChapters = :chapters, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':chapters': updatedChapters,
        ':updatedAt': new Date().toISOString()
      }
    }));

    // Update the registration request status to 'kicked'
    const existingResult = await dynamoDB.send(new ScanCommand({
      TableName: 'RegistrationRequests',
      FilterExpression: 'userId = :userId AND chapterId = :chapterId AND #status = :approvedStatus',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':userId': student.userId,
        ':chapterId': chapterHead.chapterId,
        ':approvedStatus': 'approved'
      }
    }));

    if (existingResult.Items && existingResult.Items.length > 0) {
      const registrationRequest = existingResult.Items[0];
      await dynamoDB.send(new UpdateCommand({
        TableName: 'RegistrationRequests',
        Key: { registrationId: registrationRequest.registrationId },
        UpdateExpression: 'SET #status = :status, processedAt = :processedAt, processedBy = :processedBy, notes = :notes',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': 'kicked',
          ':processedAt': new Date().toISOString(),
          ':processedBy': chapterHead.email,
          ':notes': reason || 'Removed by chapter head'
        }
      }));
    }

    // Update chapter member count
    await dynamoDB.send(new UpdateCommand({
      TableName: 'Chapters',
      Key: { chapterId: chapterHead.chapterId },
      UpdateExpression: 'SET memberCount = if_not_exists(memberCount, :zero) - :dec, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':dec': 1,
        ':zero': 0,
        ':updatedAt': new Date().toISOString()
      }
    }));

    // Create an activity record
    const activityId = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const activity = {
      activityId,
      chapterId: chapterHead.chapterId,
      type: 'student_removed',
      message: `${student.name} was removed from the chapter by chapter head`,
      timestamp: new Date().toISOString(),
      userId: student.userId,
      metadata: { 
        removedBy: chapterHead.email,
        reason: reason || 'Removed by chapter head'
      }
    };

    await dynamoDB.send(new PutCommand({
      TableName: 'Activities',
      Item: activity
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: `Successfully removed ${student.name} from ${chapter.chapterName}`,
        studentName: student.name,
        chapterName: chapter.chapterName,
        reason: reason || 'Removed by chapter head'
      })
    };
  } catch (error) {
    console.error('Error kicking student:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to remove student from chapter', details: error.message })
    };
  }
};

// GET: Check if user is member of chapter
const checkMembership = async (chapterHead, queryParams, headers) => {
  try {
    const { userId, email } = queryParams || {};
    
    let targetUser;
    if (userId) {
      const result = await dynamoDB.send(new GetCommand({
        TableName: 'Unify-Users',
        Key: { userId }
      }));
      targetUser = result.Item;
    } else if (email) {
      targetUser = await getUserByEmail(email);
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Either userId or email parameter is required' })
      };
    }

    if (!targetUser) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const isMember = await isUserMemberOfChapter(targetUser.userId, chapterHead.chapterId);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        userId: targetUser.userId,
        email: targetUser.email,
        name: targetUser.name,
        isMember,
        chapterId: chapterHead.chapterId
      })
    };
  } catch (error) {
    console.error('Error checking membership:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to check membership', details: error.message })
    };
  }
};

// GET: recent activities for the chapter
const getRecentActivities = async (chapterHead, queryParams, headers) => {
  try {
    const limit = queryParams?.limit ? parseInt(queryParams.limit) : 10;
    const result = await dynamoDB.send(new ScanCommand({
      TableName: 'Activities',
      FilterExpression: 'chapterId = :c',
      ExpressionAttributeValues: { ':c': chapterHead.chapterId }
    }));
    const activities = (result.Items || [])
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
      .map(a => ({
        id: a.activityId,
        type: a.type,
        message: a.message,
        timestamp: a.timestamp,
        chapterId: a.chapterId,
        userId: a.userId
      }));
    return { statusCode: 200, headers, body: JSON.stringify({ activities }) };
  } catch (error) {
    console.error('Error getting activities:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch activities', details: error.message }) };
  }
};

// GET: events managed by the chapter head
const getMyEvents = async (chapterHead, headers) => {
  try {
    const result = await dynamoDB.send(new ScanCommand({
      TableName: 'ChapterEvents',
      FilterExpression: 'chapterId = :c',
      ExpressionAttributeValues: { ':c': chapterHead.chapterId }
    }));
    const events = result.Items || [];
    return { statusCode: 200, headers, body: JSON.stringify({ events }) };
  } catch (error) {
    console.error('Error getting events:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch events', details: error.message }) };
  }
};

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
  };

  if (
    event.httpMethod === 'OPTIONS' ||
    event.requestContext?.http?.method === 'OPTIONS'
  ) {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('Event received:', JSON.stringify(event, null, 2));
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'No authorization header' }) };
    }
    const token = authHeader.replace('Bearer ', '');
    const userEmail = getUserEmailFromToken(token);
    console.log('Extracted user email:', userEmail);
    if (!userEmail) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) };
    }
    console.log('Verifying chapter head for email:', userEmail);
    let chapterHead = await verifyChapterHead(userEmail);
    console.log('Chapter head record:', chapterHead);
    if (!chapterHead) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied. User is not a chapter head.' }) };
    }
    chapterHead = await resolveChapterContext(chapterHead);
    if (!chapterHead.chapterId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Chapter context not linked to chapter head',
          details: 'No chapterId found for this chapter head. Add chapterId to ChapterHead table item or include chapterName that matches a Chapters record.'
        })
      };
    }

    // Unified API Gateway v1/v2 path and method resolution
    const httpMethod = event.httpMethod || event.requestContext?.http?.method;
    let path =
      event.resource ||
      (event.routeKey ? event.routeKey.replace(/^[A-Z]+\s+/, '') : undefined) ||
      (event.rawPath ? event.rawPath.replace(/^\/[^/]+/, '') : undefined);

    if (!path && event.rawPath) path = event.rawPath;

    const pathParameters = event.pathParameters || {};
    const queryStringParameters = event.queryStringParameters || {};

    console.log('Processing request:', httpMethod, path);

    switch (true) {
      case httpMethod === 'GET' && path === '/chapterhead/my-chapters':
        return await getMyChapters(chapterHead, headers);
      case httpMethod === 'GET' && path === '/chapterhead/dashboard':
        return await getDashboardStats(chapterHead, headers);
      case httpMethod === 'GET' && path === '/chapterhead/registrations':
        return await getRegistrations(chapterHead, queryStringParameters, headers);
      case httpMethod === 'GET' && path === '/chapterhead/registrations/{chapterId}':
        return await getChapterRegistrations(chapterHead, pathParameters.chapterId, headers);
      case httpMethod === 'GET' && path === '/chapterhead/events':
        return await getMyEvents(chapterHead, headers);
      case httpMethod === 'PUT' && path === '/chapterhead/toggle-registration':
        return await toggleRegistration(chapterHead, JSON.parse(event.body), headers);
      case httpMethod === 'PUT' && path === '/chapterhead/registration/{registrationId}':
        return await updateRegistrationStatus(chapterHead, pathParameters.registrationId, JSON.parse(event.body), headers);
      case httpMethod === 'DELETE' && path === '/chapterhead/kick-student':
        return await kickStudent(chapterHead, JSON.parse(event.body), headers);
      case httpMethod === 'GET' && path === '/chapterhead/check-membership':
        return await checkMembership(chapterHead, queryStringParameters, headers);
      case httpMethod === 'GET' && path === '/chapterhead/activities':
        return await getRecentActivities(chapterHead, queryStringParameters, headers);
      default:
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Endpoint not found' }) };
    }
  } catch (error) {
    console.error('Lambda error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error', details: error.message }) };
  }
};
