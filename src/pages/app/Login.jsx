import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, User, Phone, Briefcase } from 'lucide-react';
import { auth, db } from '../../firebase/firebase';

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';

import { doc, setDoc } from 'firebase/firestore';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ UI MESSAGE STATE
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await setPersistence(auth, browserLocalPersistence);

      // ================= LOGIN =================
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccess("Login successful");
      } 
      // ================= SIGNUP =================
      else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        await setDoc(doc(db, "technicians", user.uid), {
          fullName,
          phone,
          email,
          role: 'technician',
          createdAt: new Date().toISOString()
        });

        setSuccess("Account created successfully!");
        setIsLogin(true);
        setFullName('');
        setPhone('');
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      console.error(err);
      setError(
        err?.message?.replace("Firebase:", "") ||
        "Something went wrong. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-white">

      {/* ================= LEFT PANEL (BRANDING) ================= */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#C82327] text-white relative overflow-hidden flex-col justify-between p-16">
        
        {/* Background Decorative Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-red-600 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-red-900 rounded-full blur-3xl opacity-30 pointer-events-none"></div>

        <div className="relative z-10 mt-12">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-xl">
            <Briefcase className="w-8 h-8 text-[#C82327]" />
          </div>
          <h1 className="text-5xl font-black mb-6 tracking-tight leading-tight">
            Techno Steel <br /> Industries
          </h1>
          <p className="text-red-100 text-lg font-medium max-w-md leading-relaxed">
            Manage your services, track technicians, and streamline your operational workflow seamlessly.
          </p>
        </div>

        <div className="relative z-10 text-red-200 text-sm font-bold tracking-widest uppercase mb-12">
          Staff & Admin Portal
        </div>
      </div>

      {/* ================= RIGHT PANEL (FORM) ================= */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-[#FAFAFA]">
        <div className="max-w-md w-full mx-auto">
          
          {/* Mobile Logo (Visible only on small screens) */}
          <div className="lg:hidden w-14 h-14 bg-[#C82327] rounded-xl flex items-center justify-center mb-8 shadow-lg">
            <Briefcase className="w-7 h-7 text-white" />
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-gray-500 font-medium">
              {isLogin ? 'Please enter your details to sign in.' : 'Fill in your details to get started.'}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6 text-sm font-bold text-red-600 bg-red-50 px-5 py-4 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 text-sm font-bold text-emerald-600 bg-emerald-50 px-5 py-4 rounded-xl border border-emerald-100">
              {success}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            {!isLogin && (
              <>
                <Input
                  icon={<User className="w-5 h-5" />}
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={setFullName}
                />
                <Input
                  icon={<Phone className="w-5 h-5" />}
                  type="tel"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={setPhone}
                />
              </>
            )}

            <Input
              icon={<Mail className="w-5 h-5" />}
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={setEmail}
            />

            <Input
              icon={<Lock className="w-5 h-5" />}
              type="password"
              placeholder="Password"
              value={password}
              onChange={setPassword}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#C82327] text-white py-4 rounded-xl font-bold text-sm shadow-md hover:bg-red-800 active:scale-[0.98] transition-all mt-8 disabled:opacity-70 disabled:active:scale-100"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Toggle link */}
          <div className="mt-10 text-center">
            <p className="text-sm font-medium text-gray-500">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setSuccess('');
                }}
                className="text-[#C82327] font-bold hover:underline focus:outline-none transition-colors"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}

// ================= INPUT COMPONENT =================
// Designed with a flat, clean bottom-border style to avoid the "card" look
const Input = ({ icon, type, placeholder, value, onChange }) => (
  <div className="flex items-center border-b-2 border-gray-200 py-3 focus-within:border-[#C82327] transition-colors group">
    <div className="text-gray-400 mr-4 shrink-0 group-focus-within:text-[#C82327] transition-colors">
      {icon}
    </div>
    <input
      type={type}
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full py-2 text-base text-gray-900 font-semibold bg-transparent focus:outline-none placeholder:font-medium placeholder:text-gray-400"
      placeholder={placeholder}
    />
  </div>
);