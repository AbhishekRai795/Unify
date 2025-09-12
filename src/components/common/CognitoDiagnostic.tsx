import React, { useState } from 'react';
import { CognitoUserPool, CognitoUserAttribute } from 'amazon-cognito-identity-js';

const poolData = {
    UserPoolId: 'ap-south-1_ueutDQExM',
    ClientId: '6uac5t9b0oub9b1cjoot94uplc',
};

const userPool = new CognitoUserPool(poolData);

const CognitoDiagnostic: React.FC = () => {
    const [results, setResults] = useState<string[]>([]);

    const addResult = (message: string) => {
        setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const testBasicSignup = async () => {
        addResult('Testing basic signup (email + name only)...');
        const attributeList = [
            new CognitoUserAttribute({ Name: 'email', Value: 'test1@example.com' }),
            new CognitoUserAttribute({ Name: 'name', Value: 'Test User' }),
        ];

        userPool.signUp('test1@example.com', 'TempPass123!', attributeList, [], (err: any, result) => {
            if (err) {
                addResult(`❌ Basic signup failed: ${err.code || err.name} - ${err.message}`);
            } else {
                addResult(`✅ Basic signup succeeded: ${result?.userSub}`);
            }
        });
    };

    const testCustomAttributeSignup = async () => {
        addResult('Testing signup with custom attributes...');
        const attributeList = [
            new CognitoUserAttribute({ Name: 'email', Value: 'test2@example.com' }),
            new CognitoUserAttribute({ Name: 'name', Value: 'Test User 2' }),
            new CognitoUserAttribute({ Name: 'custom:sapId', Value: '12345' }),
            new CognitoUserAttribute({ Name: 'custom:year', Value: '2023' }),
        ];

        userPool.signUp('test2@example.com', 'TempPass123!', attributeList, [], (err: any, result) => {
            if (err) {
                addResult(`❌ Custom attribute signup failed: ${err.code || err.name} - ${err.message}`);
                console.error('Full error:', err);
            } else {
                addResult(`✅ Custom attribute signup succeeded: ${result?.userSub}`);
            }
        });
    };

    const testPoolConnection = async () => {
        addResult('Testing pool connection...');
        try {
            // Try to get current user (will fail but tells us if pool is accessible)
            const currentUser = userPool.getCurrentUser();
            addResult(`Pool connection: ${currentUser ? 'Active user found' : 'No active user (normal)'}`);
        } catch (err: any) {
            addResult(`❌ Pool connection error: ${err.message}`);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto mt-8">
            <h2 className="text-2xl font-bold mb-4">Cognito Diagnostic Tool</h2>
            
            <div className="space-y-3 mb-6">
                <button 
                    onClick={testPoolConnection}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Test Pool Connection
                </button>
                <button 
                    onClick={testBasicSignup}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                    Test Basic Signup
                </button>
                <button 
                    onClick={testCustomAttributeSignup}
                    className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                >
                    Test Custom Attributes
                </button>
                <button 
                    onClick={() => setResults([])}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                    Clear Results
                </button>
            </div>

            <div className="bg-gray-100 p-4 rounded h-64 overflow-y-auto">
                <h3 className="font-semibold mb-2">Test Results:</h3>
                {results.length === 0 ? (
                    <p className="text-gray-500">Click a test button to see results...</p>
                ) : (
                    results.map((result, index) => (
                        <div key={index} className="text-sm mb-1 font-mono">
                            {result}
                        </div>
                    ))
                )}
            </div>

            <div className="mt-4 text-sm text-gray-600">
                <p><strong>Note:</strong> Check browser console for detailed error logs.</p>
                <p><strong>Pool:</strong> {poolData.UserPoolId}</p>
                <p><strong>Client:</strong> {poolData.ClientId}</p>
            </div>
        </div>
    );
};

export default CognitoDiagnostic;
