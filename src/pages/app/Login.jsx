import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, User, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase/firebase'; 
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login/Signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // --- LOGIN LOGIC ---
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Redirect based on email (Admin check)
        if (email.includes('admin')) {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        // --- SIGNUP LOGIC ---
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save extra user info to Firestore
        await setDoc(doc(db, "technicians", user.uid), {
          fullName,
          phone,
          email,
          role: 'technician'
        });

        alert("Account created! Please login.");
        setIsLogin(true);
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col px-8 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute -top-12 -right-16 w-64 h-64 bg-red-100/50 rounded-[3rem] rotate-12 z-0"></div>
      <div className="absolute -top-20 -right-12 w-56 h-56 bg-[#C82327] rounded-[2.5rem] rotate-12 shadow-2xl z-0"></div>
      <div className="absolute -bottom-32 -right-24 w-96 h-96 bg-[#C82327] rounded-full opacity-90 z-0"></div>

      <div className="flex-1 flex flex-col max-w-md w-full z-10 pb-24 relative pt-16">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">{isLogin ? 'Login' : 'Sign Up'}</h1>
        <p className="text-gray-500 mb-10 font-medium">Techno Steel Industries</p>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <>
              <Input icon={<User />} type="text" placeholder="Full Name" value={fullName} onChange={setFullName} />
              <Input icon={<Phone />} type="tel" placeholder="Phone Number" value={phone} onChange={setPhone} />
            </>
          )}
          <Input icon={<Mail />} type="email" placeholder="Email Address" value={email} onChange={setEmail} />
          <Input icon={<Lock />} type="password" placeholder="Password" value={password} onChange={setPassword} />

          <button 
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-[#C82327] text-white py-4 rounded-full font-bold shadow-lg shadow-red-900/30 active:scale-95 transition-all mt-4"
          >
            {loading ? 'Processing...' : (isLogin ? 'LOGIN' : 'SIGN UP')}
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <button 
          onClick={() => setIsLogin(!isLogin)} 
          className="mt-6 text-sm font-bold text-[#C82327] text-center w-full"
        >
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
}

// Simple Input Component
const Input = ({ icon, type, placeholder, value, onChange }) => (
  <div className="bg-white flex items-center px-4 py-1 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 focus-within:ring-2 focus-within:ring-[#C82327]/20">
    <div className="text-gray-400 mr-3">{icon}</div>
    <input
      type={type}
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full py-3 text-gray-900 font-medium bg-transparent focus:outline-none"
      placeholder={placeholder}
    />
  </div>
);