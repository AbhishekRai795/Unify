// index.mjs - Node.js 22 ES Module format for AWS Lambda
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

// Helper: Get chapter by name
const getChapterByName = async (chapterName) => {
  try {
    const result = await dynamoDB.send(new ScanCommand({
      TableName: 'Chapters',
      FilterExpression: 'chapterName = :chapterName',
      ExpressionAttributeValues: { ':chapterName': chapterName }
    }));
    return result.Items?.length > 0 ? result.Items[0] : null;
  } catch (error) {
    console.error('Error getting chapter:', error);
    return null;
  }
};

// Helper: Get chapter by ID
const getChapterById = async (chapterId) => {
  try {
    const result = await dynamoDB.send(new GetCommand({
      TableName: 'Chapters',
      Key: { chapterId }
    }));
    return result.Item || null;
  } catch (error) {
    console.error('Error getting chapter by ID:', error);
    return null;
  }
};

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
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

    // Route handling
    switch (true) {
      case httpMethod === 'POST' && path === '/register-student':
        return await registerStudentForChapter(JSON.parse(event.body), userEmail, headers);
      
      case httpMethod === 'GET' && path === '/get-chapters':
        return await getAvailableChapters(userEmail, headers);
      
      case httpMethod === 'GET' && path === '/student/my-chapters':
        return await getMyChapters(userEmail, headers);
      
      case httpMethod === 'GET' && path === '/student/dashboard':
        return await getStudentDashboard(userEmail, headers);
      
      case httpMethod === 'GET' && path === '/student/pending-registrations':
        return await getPendingRegistrations(userEmail, headers);
      
      case httpMethod === 'DELETE' && path === '/student/chapters/{chapterId}/leave':
        return await leaveChapter(userEmail, pathParameters.chapterId, headers);
      
      default:
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Endpoint not found' }) };
    }
  } catch (error) {
    console.error('Lambda error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error', details: error.message }) };
  }
};

// Register student for a chapter
const registerStudentForChapter = async (body, userEmail, headers) => {
  try {
    const { chapterName, studentName, studentEmail } = body;

    // Verify the requesting user matches the student email
    if (userEmail !== studentEmail) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied. Can only register yourself.' })
      };
    }

    // Get user details
    const user = await getUserByEmail(studentEmail);
    if (!user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    // Get chapter details
    const chapter = await getChapterByName(chapterName);
    if (!chapter) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Chapter not found' })
      };
    }

    // Check if chapter registration is open
    if (!chapter.registrationOpen) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Registration is closed for this chapter' })
      };
    }

    // Check if user already has an active registration (pending or approved)
    const existingResult = await dynamoDB.send(new ScanCommand({
      TableName: 'RegistrationRequests',
      FilterExpression: 'userId = :userId AND chapterId = :chapterId AND (#status = :pending OR #status = :approved)',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':userId': user.userId,
        ':chapterId': chapter.chapterId,
        ':pending': 'pending',
        ':approved': 'approved'
      }
    }));

    if (existingResult.Items && existingResult.Items.length > 0) {
      const existingRequest = existingResult.Items[0];
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `Registration request already exists with status: ${existingRequest.status}` 
        })
      };
    }

    // Create a registration request
    const registrationId = `${user.userId}-${chapter.chapterId}-${Date.now()}`;
    const registrationRequest = {
      registrationId,
      userId: user.userId,
      studentName: user.name,
      studentEmail: user.email,
      chapterId: chapter.chapterId,
      chapterName: chapter.chapterName,
      status: 'pending',
      appliedAt: new Date().toISOString(),
      sapId: user.sapId || null,
      year: user.year || null
    };

    await dynamoDB.send(new PutCommand({
      TableName: 'RegistrationRequests',
      Item: registrationRequest
    }));

    // Create an activity record
    const activityId = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const activity = {
      activityId,
      chapterId: chapter.chapterId,
      type: 'registration',
      message: `New registration request from ${user.name}`,
      timestamp: new Date().toISOString(),
      userId: user.userId,
      metadata: { registrationId }
    };

    await dynamoDB.send(new PutCommand({
      TableName: 'Activities',
      Item: activity
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Registration request submitted successfully. Awaiting chapter head approval.',
        registrationId,
        chapterName,
        studentName,
        status: 'pending'
      })
    };
  } catch (error) {
    console.error('Error registering student:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to register for chapter', details: error.message })
    };
  }
};

// Get all available chapters
const getAvailableChapters = async (userEmail, headers) => {
  try {
    const result = await dynamoDB.send(new ScanCommand({
      TableName: 'Chapters',
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': 'active' }
    }));
    // Add registration status and transform data for frontend
    const chapters = (result.Items || []).map(chapter => ({
      id: chapter.chapterId,
      name: chapter.chapterName,
      description: `Managed by ${chapter.headName}`,
      category: 'General',
      adminId: chapter.chapterId,
      adminName: chapter.headName,
      isRegistrationOpen: chapter.registrationOpen || false,
      memberCount: chapter.memberCount || 0,
      requirements: ['Active participation', 'Regular attendance'],
      benefits: ['Skill development', 'Networking opportunities'],
      meetingSchedule: 'Weekly meetings',
      contactEmail: chapter.headEmail,
      tags: ['student-organization'],
      createdAt: chapter.createdAt,
      updatedAt: chapter.updatedAt
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ chapters }) };
  } catch (error) {
    console.error('Error getting chapters:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch chapters', details: error.message })
    };
  }
};

// Get student's registered chapters
const getMyChapters = async (userEmail, headers) => {
  try {
    const user = await getUserByEmail(userEmail);
    if (!user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    // Get approved registration requests for this user
    const approvedResult = await dynamoDB.send(new ScanCommand({
      TableName: 'RegistrationRequests',
      FilterExpression: 'userId = :userId AND #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':userId': user.userId,
        ':status': 'approved'
      }
    }));

    const approvedRegistrations = approvedResult.Items || [];
    
    if (approvedRegistrations.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ chapters: [] })
      };
    }

    // Get details for each approved chapter
    const chapterPromises = approvedRegistrations.map(async (request) => {
      const chapter = await getChapterById(request.chapterId);
      if (chapter) {
        return {
          ...chapter,
          joinedAt: request.appliedAt,
          approvedAt: request.processedAt
        };
      }
      return null;
    });

    const chapters = await Promise.all(chapterPromises);
    const validChapters = chapters.filter(chapter => chapter !== null);

    const formattedChapters = validChapters.map(chapter => ({
      id: chapter.chapterId,
      name: chapter.chapterName,
      description: `Managed by ${chapter.headName}`,
      memberCount: chapter.memberCount || 0,
      headName: chapter.headName,
      headEmail: chapter.headEmail,
      status: chapter.status,
      joinedAt: chapter.joinedAt,
      approvedAt: chapter.approvedAt
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ chapters: formattedChapters }) };
  } catch (error) {
    console.error('Error getting my chapters:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch registered chapters', details: error.message })
    };
  }
};

// Get student dashboard data
const getStudentDashboard = async (userEmail, headers) => {
  try {
    const user = await getUserByEmail(userEmail);
    if (!user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const registeredChapters = user.registeredChapters ? Array.from(user.registeredChapters) : [];
    
    // Get chapter details
    const chapterPromises = registeredChapters.map(async (chapterName) => {
      return await getChapterByName(chapterName);
    });

    const chapters = await Promise.all(chapterPromises);
    const validChapters = chapters.filter(chapter => chapter !== null);

    const dashboardData = {
      student: {
        name: user.name,
        email: user.email,
        sapId: user.sapId,
        year: user.year,
        registeredChaptersCount: registeredChapters.length
      },
      chapters: validChapters.map(chapter => ({
        id: chapter.chapterId,
        name: chapter.chapterName,
        headName: chapter.headName,
        memberCount: chapter.memberCount || 0
      })),
      stats: {
        totalChapters: registeredChapters.length,
        upcomingEvents: 0, // Implement when you add events
        completedEvents: 0
      }
    };

    return { statusCode: 200, headers, body: JSON.stringify(dashboardData) };
  } catch (error) {
    console.error('Error getting dashboard:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch dashboard data', details: error.message })
    };
  }
};

// Leave a chapter
const leaveChapter = async (userEmail, chapterId, headers) => {
  try {
    const user = await getUserByEmail(userEmail);
    if (!user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    // Get chapter details
    const chapter = await getChapterById(chapterId);
    if (!chapter) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Chapter not found' })
      };
    }

    // Check if user has an approved registration for this chapter
    const existingResult = await dynamoDB.send(new ScanCommand({
      TableName: 'RegistrationRequests',
      FilterExpression: 'userId = :userId AND chapterId = :chapterId AND #status = :approvedStatus',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':userId': user.userId,
        ':chapterId': chapterId,
        ':approvedStatus': 'approved'
      }
    }));

    if (!existingResult.Items || existingResult.Items.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Not currently a member of this chapter' })
      };
    }

    const registrationRequest = existingResult.Items[0];

    // Delete the registration request completely so user can re-register
    await dynamoDB.send(new UpdateCommand({
      TableName: 'RegistrationRequests',
      Key: { registrationId: registrationRequest.registrationId },
      UpdateExpression: 'SET #status = :status, processedAt = :processedAt, processedBy = :processedBy',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'left',
        ':processedAt': new Date().toISOString(),
        ':processedBy': user.email
      }
    }));

    // Update user's registered chapters in Users table (remove from set)
    const currentChapters = user.registeredChapters ? Array.from(user.registeredChapters) : [];
    const updatedChapters = currentChapters.filter(name => name !== chapter.chapterName);

    await dynamoDB.send(new UpdateCommand({
      TableName: 'Unify-Users',
      Key: { userId: user.userId },
      UpdateExpression: 'SET registeredChapters = :chapters, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':chapters': updatedChapters,
        ':updatedAt': new Date().toISOString()
      }
    }));

    // Update chapter member count (ensure it doesn't go below 0)
    await dynamoDB.send(new UpdateCommand({
      TableName: 'Chapters',
      Key: { chapterId },
      UpdateExpression: 'SET memberCount = if_not_exists(memberCount, :zero) - :dec, updatedAt = :updatedAt',
      ConditionExpression: 'memberCount > :zero',
      ExpressionAttributeValues: {
        ':dec': 1,
        ':zero': 0,
        ':updatedAt': new Date().toISOString()
      }
    })).catch(async (error) => {
      // If condition fails, set memberCount to 0
      if (error.name === 'ConditionalCheckFailedException') {
        await dynamoDB.send(new UpdateCommand({
          TableName: 'Chapters',
          Key: { chapterId },
          UpdateExpression: 'SET memberCount = :zero, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':zero': 0,
            ':updatedAt': new Date().toISOString()
          }
        }));
      } else {
        throw error;
      }
    });

    // Create activity record
    const activityId = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const activity = {
      activityId,
      chapterId: chapter.chapterId,
      type: 'member_left',
      message: `${user.name} left the chapter`,
      timestamp: new Date().toISOString(),
      userId: user.userId,
      metadata: { registrationId: registrationRequest.registrationId }
    };

    await dynamoDB.send(new PutCommand({
      TableName: 'Activities',
      Item: activity
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Successfully left chapter',
        chapterName: chapter.chapterName
      })
    };
  } catch (error) {
    console.error('Error leaving chapter:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to leave chapter', details: error.message })
    };
  }
};

const getPendingRegistrations = async (userEmail, headers) => {
  try {
    const user = await getUserByEmail(userEmail);
    if (!user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    // Get all registration requests for this user
    const params = {
      TableName: 'RegistrationRequests',
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': user.userId
      }
    };

    const result = await dynamoDB.send(new ScanCommand(params));
    const requests = result.Items || [];

    // Format the registration requests
    const formattedRequests = requests.map(request => ({
      registrationId: request.registrationId,
      chapterId: request.chapterId,
      chapterName: request.chapterName,
      status: request.status,
      appliedAt: request.appliedAt,
      processedAt: request.processedAt || null,
      processedBy: request.processedBy || null,
      notes: request.notes || null
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        registrations: formattedRequests,
        totalCount: formattedRequests.length,
        pendingCount: formattedRequests.filter(r => r.status === 'pending').length,
        approvedCount: formattedRequests.filter(r => r.status === 'approved').length,
        rejectedCount: formattedRequests.filter(r => r.status === 'rejected').length,
        leftCount: formattedRequests.filter(r => r.status === 'left').length,
        kickedCount: formattedRequests.filter(r => r.status === 'kicked').length
      })
    };
  } catch (error) {
    console.error('Error getting pending registrations:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch registration requests' })
    };
  }
};


