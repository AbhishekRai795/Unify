// Cognito Console Diagnostic Tool
// Copy this entire code into your browser console and run it

(function() {
    console.log(' COGNITO DIAGNOSTIC TOOL LOADED');
    console.log('Available commands:');
    console.log('- testBasicSignup()     // Test signup with just email + name');
    console.log('- testCustomSignup()    // Test signup with custom attributes');
    console.log('- testPoolConnection()  // Test if pool is accessible');
    console.log('- runAllTests()         // Run all tests');

    // Import required Cognito classes (assuming they're available globally)
    const { CognitoUserPool, CognitoUserAttribute } = window.AmazonCognitoIdentity || {};
    
    if (!CognitoUserPool) {
        console.error(' CognitoUserPool not found. Make sure you\'re on the auth page.');

        return;
    }

    const poolData = {
        UserPoolId: 'ap-south-1_ueutDQExM',
        ClientId: '6uac5t9b0oub9b1cjoot94uplc',
    };

    const userPool = new CognitoUserPool(poolData);

    // Test basic signup
    window.testBasicSignup = function() {
        console.log('🧪 Testing basic signup...');
        const attributeList = [
            new CognitoUserAttribute({ Name: 'email', Value: 'consoletest1@example.com' }),
            new CognitoUserAttribute({ Name: 'name', Value: 'Console Test User' }),
        ];

        userPool.signUp('consoletest1@example.com', 'TestPass123!@#', attributeList, [], (err, result) => {
            if (err) {
                console.error(' BASIC SIGNUP FAILED:');
                console.error('Error Code:', err.code || err.name);
                console.error('Error Message:', err.message);
                console.error('Status Code:', err.statusCode);
                console.error('Full Error:', err);
            } else {
                console.log(' BASIC SIGNUP SUCCEEDED:');
                console.log('User Sub:', result?.userSub);
                console.log('User Confirmed:', result?.userConfirmed);
            }
        });
    };

    // Test custom attribute signup
    window.testCustomSignup = function() {
        console.log(' Testing custom attribute signup...');
        const attributeList = [
            new CognitoUserAttribute({ Name: 'email', Value: 'consoletest2@example.com' }),
            new CognitoUserAttribute({ Name: 'name', Value: 'Console Test User 2' }),
            new CognitoUserAttribute({ Name: 'custom:sapId', Value: '99999' }),
            new CognitoUserAttribute({ Name: 'custom:year', Value: '2024' }),
        ];

        console.log(' Sending attributes:', attributeList.map(attr => ({name: attr.Name, value: attr.Value})));

        userPool.signUp('consoletest2@example.com', 'TestPass123!@#', attributeList, [], (err, result) => {
            if (err) {
                console.error(' CUSTOM SIGNUP FAILED:');
                console.error('Error Code:', err.code || err.name);
                console.error('Error Message:', err.message);
                console.error('Status Code:', err.statusCode);
                console.error('Full Error:', err);
            } else {
                console.log(' CUSTOM SIGNUP SUCCEEDED:');
                console.log('User Sub:', result?.userSub);
                console.log('User Confirmed:', result?.userConfirmed);
            }
        });
    };

    // Test pool connection
    window.testPoolConnection = function() {
        console.log(' Testing pool connection...');
        try {
            const currentUser = userPool.getCurrentUser();
            console.log(' Pool Connection: OK');
            console.log('Current User:', currentUser ? 'Found' : 'None (normal for new signup)');
            console.log('Pool Config:', poolData);
        } catch (err) {
            console.error(' Pool Connection Error:', err);
        }
    };

    // Run all tests
    window.runAllTests = function() {
        console.log(' Running all Cognito tests...');
        console.log('=====================================');
        
        testPoolConnection();
        
        setTimeout(() => {
            console.log('\n--- Testing Basic Signup ---');
            testBasicSignup();
        }, 1000);
        
        setTimeout(() => {
            console.log('\n--- Testing Custom Attribute Signup ---');
            testCustomSignup();
        }, 2000);
    };

    console.log(' Diagnostic tool ready! Try: runAllTests()');
})();
