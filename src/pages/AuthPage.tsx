import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom'; // No longer needed
import { motion, AnimatePresence, Transition, Variants } from 'framer-motion';
import { 
    CognitoUserPool, 
    CognitoUser, 
    AuthenticationDetails, 
    CognitoUserAttribute,
    ISignUpResult,
    CognitoUserSession
} from 'amazon-cognito-identity-js';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Loader from '../components/common/Loader';
import ThemeToggle from '../components/common/ThemeToggle';
import { Eye, EyeOff, Mail, Lock, User, Users, Shield, Hash, Calendar, Library } from 'lucide-react';

const poolData = {
    // Replace with your Cognito User Pool data
    UserPoolId: 'ap-south-1_ueutDQExM',
    ClientId: '6uac5t9b0oub9b1cjoot94uplc',
};

const userPool = new CognitoUserPool(poolData);

// Reusable Form Input Component
const FormInput: React.FC<{icon: React.ElementType, type?: string, placeholder: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, children?: React.ReactNode}> = ({ icon: Icon, type = 'text', placeholder, value, onChange, children }) => (
    <div className="relative flex items-center w-full">
        <Icon className="absolute left-3 h-5 w-5 text-gray-400" />
        <input 
            type={type} 
            placeholder={placeholder} 
            value={value} 
            onChange={onChange} 
            required 
            className="w-full pl-10 pr-10 py-3 text-gray-800 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
        />
        {children}
    </div>
);

// Floating Bubbles Component for the background effect
const FloatingBubbles: React.FC = () => {
    const bubbles = Array.from({ length: 15 });
    return (
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
            {bubbles.map((_, i) => (
                <div
                    key={i}
                    className="bubble"
                    style={{
                        left: `${Math.random() * 100}%`,
                        width: `${Math.random() * 80 + 20}px`,
                        height: `${Math.random() * 80 + 20}px`,
                        animationDuration: `${Math.random() * 15 + 8}s`,
                        animationDelay: `${Math.random() * 3}s`,
                    }}
                />
            ))}
        </div>
    );
};

// Define AuthForm outside of AuthPage
const AuthForm: React.FC<{
    isLogin: boolean;
    handleAuthAction: (event: React.FormEvent) => void;
    name: string; setName: (name: string) => void;
    email: string; setEmail: (email: string) => void;
    password: string; setPassword: (password: string) => void;
    confirmPassword: string; setConfirmPassword: (password: string) => void;
    showPassword: boolean; setShowPassword: (show: boolean) => void;
    showConfirmPassword: boolean; setShowConfirmPassword: (show: boolean) => void;
    setIsLoginView: (isLogin: boolean) => void;
    sapId: string; setSapId: (id: string) => void;
    year: string; setYear: (year: string) => void;
}> = ({ isLogin, handleAuthAction, name, setName, email, setEmail, password, setPassword, confirmPassword, setConfirmPassword, showPassword, setShowPassword, showConfirmPassword, setShowConfirmPassword, setIsLoginView, sapId, setSapId, year, setYear }) => {
    
    return (
    <div className="w-full max-w-sm">
         <div className="flex items-center gap-3 mb-4">
            <Users className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-800">Unify</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">{isLogin ? 'Welcome Back!' : 'Join the Community'}</h2>
        <p className="text-gray-500 mb-8">Enter your details to continue.</p>
        
        <form onSubmit={handleAuthAction} className="w-full space-y-4">
            {!isLogin && (
                <>
                    <FormInput icon={User} placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
                    <FormInput icon={Hash} placeholder="SAP ID" value={sapId} onChange={(e) => setSapId(e.target.value)} />
                    <FormInput icon={Calendar} placeholder="Year of Study" value={year} onChange={(e) => setYear(e.target.value)} />
                </>
            )}
            <FormInput icon={Mail} type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
            <FormInput icon={Lock} type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}>
                 <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            </FormInput>
            
            {!isLogin && (
                <FormInput icon={Lock} type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}>
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </FormInput>
            )}
            
            {isLogin && (
                <div className="text-right">
                    <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700">Forgot password?</a>
                </div>
            )}

            <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity">
                {isLogin ? 'Sign In' : 'Create Account'}
            </button>

            <p className="text-gray-600 text-sm pt-4 text-center">
                {isLogin ? "New here?" : "Already have an account?"}{' '}
                <button type="button" onClick={() => setIsLoginView(!isLogin)} className="text-blue-600 hover:text-blue-700 font-semibold">
                    {isLogin ? 'Create an account' : 'Sign In'}
                </button>
            </p>
        </form>
    </div>
)};

// New Password Form Component
const NewPasswordForm: React.FC<{
    handleNewPasswordSubmit: (e: React.FormEvent) => void;
    newPasswordName: string; setNewPasswordName: (name: string) => void;
    newPasswordChapterName: string; setNewPasswordChapterName: (name: string) => void;
    newPassword: string; setNewPassword: (password: string) => void;
    confirmNewPassword: string; setConfirmNewPassword: (password: string) => void;
    newPasswordError: string;
    showNewPassword: boolean; setShowNewPassword: (show: boolean) => void;
    showConfirmNewPassword: boolean; setShowConfirmNewPassword: (show: boolean) => void;
}> = ({ handleNewPasswordSubmit, newPasswordName, setNewPasswordName, newPasswordChapterName, setNewPasswordChapterName, newPassword, setNewPassword, confirmNewPassword, setConfirmNewPassword, newPasswordError, showNewPassword, setShowNewPassword, showConfirmNewPassword, setShowConfirmNewPassword }) => (
    <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
            <Users className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-800">Unify</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Set Your Profile</h2>
        <p className="text-gray-500 mb-8">Welcome! Please set your details and a new password to continue.</p>
        
        {newPasswordError && <p className="text-red-500 text-center mb-4">{newPasswordError}</p>}
        
        <form onSubmit={handleNewPasswordSubmit} className="space-y-4">
            <FormInput icon={User} placeholder="Full Name" value={newPasswordName} onChange={(e) => setNewPasswordName(e.target.value)} />
            <FormInput icon={Library} placeholder="Chapter Name" value={newPasswordChapterName} onChange={(e) => setNewPasswordChapterName(e.target.value)} />
            <FormInput icon={Lock} type={showNewPassword ? 'text' : 'password'} placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}>
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            </FormInput>
            <FormInput icon={Lock} type={showConfirmNewPassword ? 'text' : 'password'} placeholder="Confirm New Password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)}>
                <button type="button" onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirmNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            </FormInput>
            <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity">
                Set Password and Sign In
            </button>
        </form>
    </div>
);


const QuotePanel: React.FC<{ isLoginView: boolean; setIsLoginView: (isLogin: boolean) => void; }> = ({ isLoginView, setIsLoginView }) => (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center p-12 bg-gradient-to-br from-blue-600 to-purple-600 text-white overflow-hidden">
        <div className="absolute inset-0 w-full h-full bg-black/10 backdrop-blur-sm"></div>
        <FloatingBubbles />
        <div className="relative z-10 max-w-md">
             <Users className="h-16 w-16 mx-auto mb-6" />
            <h3 className="text-3xl font-bold">
                "Connecting students, one chapter at a time. Your community awaits."
            </h3>
            <p className="mt-4 opacity-80">- The Unify Team</p>
            <button onClick={() => setIsLoginView(!isLoginView)} className="mt-8 bg-white/20 border-2 border-white/50 rounded-full font-semibold uppercase px-12 py-3 hover:bg-white/30 transition-colors duration-300">
                {isLoginView ? 'Sign Up' : 'Sign In'}
            </button>
        </div>
    </div>
);

const AuthPage: React.FC = () => {
    const { isDark } = useTheme();
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [sapId, setSapId] = useState('');
    const [year, setYear] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [otp, setOtp] = useState('');
    const [showOtpView, setShowOtpView] = useState(false);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // State for the new password challenge
    const [newPasswordRequired, setNewPasswordRequired] = useState(false);
    const [cognitoUserForChallenge, setCognitoUserForChallenge] = useState<CognitoUser | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [newPasswordName, setNewPasswordName] = useState('');
    const [newPasswordChapterName, setNewPasswordChapterName] = useState('');
    const [newPasswordError, setNewPasswordError] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
    
    const auth = useAuth();

    const handleAuthAction = (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        if (isLoginView) handleSignIn();
        else {
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                setLoading(false);
                return;
            }
            handleSignUp();
        }
    };

    const handleSignUp = () => {
        const attributeList = [
            new CognitoUserAttribute({ Name: 'email', Value: email }),
            new CognitoUserAttribute({ Name: 'name', Value: name }),
            new CognitoUserAttribute({ Name: 'custom:sap_id', Value: sapId }),
            new CognitoUserAttribute({ Name: 'custom:year', Value: year }),
        ];
        userPool.signUp(email, password, attributeList, [], (err?: Error, result?: ISignUpResult) => {
            setLoading(false);
            if (err) {
                setError(err.message || 'An error occurred during sign-up.');
                return;
            }
            if (result?.userConfirmed) {
                handleSignIn();
            } else {
                setShowOtpView(true);
            }
        });
    };

    const handleSignIn = () => {
        try {
            const authDetails = new AuthenticationDetails({ Username: email, Password: password });
            const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
            cognitoUser.setAuthenticationFlowType('USER_SRP_AUTH');
            cognitoUser.authenticateUser(authDetails, {
                onSuccess: (result: CognitoUserSession) => {
                    setLoading(false);
                    const idToken = result.getIdToken().getJwtToken();
                    auth.login(idToken);
                },
                onFailure: (err: Error) => {
                    setLoading(false);
                    setError(err.message || 'Invalid email, password, or role.');
                },
                newPasswordRequired: (_userAttributes: any, _requiredAttributes: any) => {
                    setLoading(false);
                    setCognitoUserForChallenge(cognitoUser);
                    setNewPasswordRequired(true);
                }
            } as any);
        } catch (err: any) {
            setLoading(false);
            setError(err.message || 'An unexpected error occurred during sign-in.');
        }
    };

    const handleNewPasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setNewPasswordError('');

        if (newPassword !== confirmNewPassword) {
            setNewPasswordError("Passwords do not match.");
            setLoading(false);
            return;
        }

        if (!cognitoUserForChallenge) {
            setNewPasswordError("Error: No user context available for password change.");
            setLoading(false);
            return;
        }

        const attributes = {
            name: newPasswordName,
        };

        cognitoUserForChallenge.completeNewPasswordChallenge(newPassword, attributes, {
            onSuccess: async (session) => {
                setNewPasswordError(""); // Clear old errors
                try {
                    const apiRes = await fetch(
                        "https://y0fr6gasgk.execute-api.ap-south-1.amazonaws.com/dev/chapterhead-profile",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                email,
                                chapterName: newPasswordChapterName
                            })
                        }
                    );
                    
                    if (!apiRes.ok) {
                        const apiResult = await apiRes.json();
                        throw new Error(apiResult.error || "Failed to save chapter info.");
                    }
    
                    setLoading(false);
                    setNewPasswordRequired(false);
                    setCognitoUserForChallenge(null);
                    auth.login(session.getIdToken().getJwtToken());

                } catch (err: any) {
                    setNewPasswordError(err.message || "API error. Could not save chapter info.");
                    setLoading(false);
                }
            },
            onFailure: (err) => {
                setLoading(false);
                setNewPasswordError(err.message || "An unexpected error occurred.");
            }
        });
    };

    const handleOtpVerification = (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        new CognitoUser({ Username: email, Pool: userPool }).confirmRegistration(otp, true, (err) => {
            setLoading(false);
            if (err) {
                setError(err.message || 'Invalid OTP.');
                return;
            }
            setShowOtpView(false);
            handleSignIn();
        });
    };

    const springTransition: Transition = { type: "spring", stiffness: 200, damping: 28 };
    
    const formContentVariants: Variants = {
        hidden: { opacity: 0, x: 30, scale: 0.95 },
        visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
        exit: { opacity: 0, x: -30, scale: 0.95, transition: { duration: 0.3, ease: "easeIn" } }
    };
    
    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-100"><Loader /></div>;

    if (showOtpView) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">
                    <h2 className="text-2xl font-bold text-center mb-2">Verify Your Account</h2>
                    <p className="text-gray-600 text-center mb-6">An OTP has been sent to {email}.</p>
                    {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                    <form onSubmit={handleOtpVerification} className="space-y-6">
                        <FormInput icon={Lock} placeholder="Verification Code" value={otp} onChange={(e) => setOtp(e.target.value)} />
                        <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity">
                            Verify & Sign In
                        </button>
                    </form>
                </div>
            </div>
        );
    }
    
    return (
        <div className={`
          min-h-screen transition-all duration-500
          ${isDark ? 'bg-dark-bg' : 'bg-gray-100'}
        `}>
            {/* Theme Toggle */}
            <div className="absolute top-4 right-4 z-50">
                <ThemeToggle />
            </div>
            
            {/* Dark mode background effects */}
            {isDark && (
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                    <div className="absolute top-1/2 left-0 w-64 h-64 bg-accent-400/5 rounded-full blur-2xl animate-float"></div>
                </div>
            )}
            <style>{`
                @keyframes float { 0% { transform: translateY(100vh) rotate(0deg); opacity: 0.8; } 100% { transform: translateY(-20vh) rotate(720deg); opacity: 0; } }
                .bubble { position: absolute; bottom: -150px; background: rgba(255, 255, 255, 0.1); border-radius: 50%; animation: float linear infinite; }
            `}</style>
            <div className="hidden lg:flex relative w-full h-screen">
                
                <motion.div 
                    className="absolute top-0 left-0 h-full w-3/5"
                    animate={{ x: isLoginView ? '66.666%' : '0%' }}
                    transition={springTransition}
                >
                    <QuotePanel isLoginView={isLoginView} setIsLoginView={setIsLoginView} />
                </motion.div>

                <motion.div 
                    className="absolute top-0 left-0 h-full w-2/5 bg-white flex items-center justify-center overflow-hidden"
                    animate={{ x: isLoginView ? '0%' : '150%' }}
                    transition={springTransition}
                >
                    <AnimatePresence mode="wait">
                        {newPasswordRequired ? (
                            <motion.div
                                key="new-password"
                                variants={formContentVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="w-full flex justify-center px-4"
                            >
                                <NewPasswordForm 
                                    handleNewPasswordSubmit={handleNewPasswordSubmit}
                                    newPasswordName={newPasswordName}
                                    setNewPasswordName={setNewPasswordName}
                                    newPasswordChapterName={newPasswordChapterName}
                                    setNewPasswordChapterName={setNewPasswordChapterName}
                                    newPassword={newPassword}
                                    setNewPassword={setNewPassword}
                                    confirmNewPassword={confirmNewPassword}
                                    setConfirmNewPassword={setConfirmNewPassword}
                                    newPasswordError={newPasswordError}
                                    showNewPassword={showNewPassword}
                                    setShowNewPassword={setShowNewPassword}
                                    showConfirmNewPassword={showConfirmNewPassword}
                                    setShowConfirmNewPassword={setShowConfirmNewPassword}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key={isLoginView ? 'login' : 'signup'}
                                variants={formContentVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="w-full flex justify-center px-4"
                            >
                                <AuthForm 
                                    isLogin={isLoginView}
                                    handleAuthAction={handleAuthAction}
                                    name={name} setName={setName}
                                    email={email} setEmail={setEmail}
                                    password={password} setPassword={setPassword}
                                    confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
                                    showPassword={showPassword} setShowPassword={setShowPassword}
                                    showConfirmPassword={showConfirmPassword} setShowConfirmPassword={setShowConfirmPassword}
                                    setIsLoginView={setIsLoginView}
                                    sapId={sapId} setSapId={setSapId}
                                    year={year} setYear={setYear}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
            
            <div className="lg:hidden w-full min-h-screen bg-white p-8 flex items-center justify-center">
                 {newPasswordRequired ? (
                     <NewPasswordForm 
                        handleNewPasswordSubmit={handleNewPasswordSubmit}
                        newPasswordName={newPasswordName}
                        setNewPasswordName={setNewPasswordName}
                        newPasswordChapterName={newPasswordChapterName}
                        setNewPasswordChapterName={setNewPasswordChapterName}
                        newPassword={newPassword}
                        setNewPassword={setNewPassword}
                        confirmNewPassword={confirmNewPassword}
                        setConfirmNewPassword={setConfirmNewPassword}
                        newPasswordError={newPasswordError}
                        showNewPassword={showNewPassword}
                        setShowNewPassword={setShowNewPassword}
                        showConfirmNewPassword={showConfirmNewPassword}
                        setShowConfirmNewPassword={setShowConfirmNewPassword}
                    />
                 ) : (
                    <AuthForm 
                        isLogin={isLoginView}
                        handleAuthAction={handleAuthAction}
                        name={name} setName={setName}
                        email={email} setEmail={setEmail}
                        password={password} setPassword={setPassword}
                        confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
                        showPassword={showPassword} setShowPassword={setShowPassword}
                        showConfirmPassword={showConfirmPassword} setShowConfirmPassword={setShowConfirmPassword}
                        setIsLoginView={setIsLoginView}
                        sapId={sapId} setSapId={setSapId}
                        year={year} setYear={setYear}
                    />
                 )}
            </div>
        </div>
    );
};

export default AuthPage;
