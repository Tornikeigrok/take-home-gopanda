import { useEffect, useState } from 'react'
import './App.css'
import { useNavigate } from 'react-router-dom'
import toast, { Toaster } from "react-hot-toast";
import Cookies from 'js-cookie';
type View = 'login' | 'register' | 'forgot'
import { getUrl } from './ApiCall';

function App() {
  const navigate = useNavigate();
  //--- This is for login modal popping up ---//
  const [showLoginModal, setShowLoginModal] = useState(false)

  const [view, setView] = useState<View>('login')

  //--- The states for registering an account ---//
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  //--- The states for logging in ---//
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  //--- The states for resetting password ---//
  const [resetEmail, setResetEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [repeatNewPassword, setRepeatNewPassword] = useState('')


  //--- Prevent the scroll while the login modal is displayed ---//
  useEffect(() => {
    document.body.style.overflow = showLoginModal ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showLoginModal])


  //--- Store errors for readability --- //
  const errors: Record<number, string> = {
  401: "Invalid Credentials.",
  404: "Email not found please register.",
  409: "Email already exists, please login.",
  429: "Too many requests, try again later.",
  };

  //--- Api call to register endpoint to create an account ---///
  const registerCall = async () => {
    if(password.length < 8){
       toast.error("Password must be at least 8 characters");
       return;
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if(!hasLetter || !hasNumber){
       toast.error("Password must contain at least one letter and one number");
    return;
    }

    try {
      const res = await fetch(getUrl('registerUser'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: firstName, 
          email: email, 
          password: password 
        }),
      })
      const data = await res.json();
      if (res.ok) {
        Cookies.set('access-token', data.token);
        setTimeout(()=>{
          navigate('/Dashboard');
        }, 500);
       
      }
      else if(errors[res.status]){
          toast.error(errors[res.status]);
          return;
      }
    } catch (error) {
      console.error(error)
    }
  }

  //--- Login endpoint ---//
    const loginCall = async () => {
    try {
      const res = await fetch(getUrl('userLogin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: loginEmail, 
          password: loginPassword 
        }),
      })
      const data = await res.json();
      if (res.ok) {
        //--- Once logged in, save the token in Cookies ---//
        Cookies.set("access-token", data.token);
        setTimeout(()=>{
          navigate('/Dashboard');
        }, 500);
        console.log('successfully registered');
      }
      else if(errors[res.status]){
        toast.error(errors[res.status]);
        return;
      }
    } catch (error) {
      console.error(error);
      Cookies.remove('access-token');
    }
  }

  //--- This is Reset password endpoint ---//

  const resetPassword = async()=>{
    try {
      const res = await fetch(getUrl('resetPassword'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: resetEmail, 
          password: newPassword 
        }),
      })
      if (res.ok) {
        toast.success("Password Successfully Changed.");
        setTimeout(()=>{
            setView('login');
        }, 1000);
      }
      else if(res.status === 404){
        toast.error("Account does not exist.");
        return;
      }
    } catch (error) {
      console.error(error);
      return;
    }
  };




  //--- This is for displaying the steps on the welcome page ---//
  const steps = [
    { step: 'Step 1', title: 'Create an account', desc: 'Register and log in to access the booking system.' },
    { step: 'Step 2', title: 'Browse rooms',      desc: 'Filter available rooms by capacity, purpose, or time.' },
    { step: 'Step 3', title: 'Place a hold',      desc: 'Pick a time slot to put a tentative hold on your room.' },
    { step: 'Step 4', title: 'Confirm booking',   desc: 'Confirm within 10 minutes or the slot is released.' },
  ]

  const inputClass =
    "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
  const labelClass = "text-xs font-medium text-neutral-700"

  return (
    <div className="min-h-screen text-neutral-900">
    
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/60 border-b border-white/40">
        <nav className="w-11/12 max-w-6xl mx-auto flex items-center justify-between py-3 md:py-4">
          <a href="#" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white text-sm font-bold">
              M
            </span>
            <span className="text-lg md:text-xl font-bold tracking-tight">MeetMe</span>
          </a>

          

          <button
            onClick={() => setShowLoginModal(true)}
            className="text-sm md:text-base border border-neutral-900 rounded-full px-4 py-1.5 md:px-5 md:py-2
                       hover:bg-neutral-900 hover:text-white transition-all duration-200 cursor-pointer"
          >
            Log in
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section className="w-11/12 max-w-6xl mx-auto px-2 pt-12 md:pt-24 pb-16 md:pb-28 flex flex-col items-center text-center">
        <h1 className="text-3xl sm:text-5xl md:text-6xl tracking-tight leading-tight max-w-3xl">
          Book the right room,{' '}
          <span className="text-3xl sm:text-5xl md:text-6xl tracking-tight leading-tight max-w-3xl">
            without the back-and-forth
          </span>
        </h1>

        <p className="mt-5 md:mt-6 text-base md:text-lg text-neutral-700 max-w-xl">
          A room scheduling system that makes it effortless to find, hold, and confirm
          the space you need — in under a minute.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowLoginModal(true)}
            className="bg-neutral-900 text-white rounded-full px-6 py-3 text-sm md:text-base font-medium
                       hover:bg-neutral-800 transition-all duration-200 cursor-pointer shadow-sm"
          >
            Try it free
          </button>
        </div>
      </section>

      {/* How to use */}
      <section className="w-11/12 max-w-6xl mx-auto px-2 pb-20 md:pb-28">
        <div className="flex flex-col items-center text-center mb-10 md:mb-14">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            How to use MeetMe
          </h2>
          <p className="mt-3 text-neutral-700 max-w-lg">
            Four small steps from sign up to a confirmed room.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {steps.map((data, i) => (
            <div
              key={i}
              className="group relative rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60
                         p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white text-sm mb-4">
                {i + 1}
              </div>
              <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">
                {data.step}
              </div>
              <h3 className="text-lg font-semibold mb-1.5">{data.title}</h3>
              <p className="text-sm text-neutral-700 leading-relaxed">{data.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Login / Register / Forgot modal */}
      <section className={`${showLoginModal ? 'flex' : 'hidden'} fixed inset-0 items-center justify-center bg-black/10 backdrop-blur-lg z-50`}>
        <div className="w-[92vw] max-w-[420px] rounded-2xl bg-white/90 backdrop-blur-md border border-white/60 shadow-xl p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6 justify-between">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white text-sm font-bold">
              M
            </span>
           
            <button
              onClick={() => setShowLoginModal(false)}
              className="flex items-center justify-center border border-neutral-400 hover:border-neutral-500 rounded-full p-1 w-7 h-7 text-xs"
            >
              X
            </button>
          </div>

          {view === 'login' && (
            <section>
              <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
              <p className="mt-1 text-sm text-neutral-600">Sign in to your MeetMe account.</p>

              <form
                className="mt-6 flex flex-col gap-4"
                onSubmit={(e) => { e.preventDefault(); loginCall() }}
              >
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Email</span>
                  <input
                    required
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="flex items-center justify-between">
                    <span className={labelClass}>Password</span>
                    <button
                      type="button"
                      onClick={() => setView('forgot')}
                      className="text-xs text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
                    >
                      Forgot?
                    </button>
                  </span>
                  <input
                    required
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className={inputClass}
                  />
                </label>

                <button
                  type="submit"
                  className="mt-2 w-full bg-neutral-900 text-white rounded-full py-2.5 text-sm font-medium
                             hover:bg-neutral-800 transition-all duration-200 cursor-pointer"
                >
                  Sign in
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-neutral-600">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => setView('register')}
                  className="font-medium text-neutral-900 hover:underline cursor-pointer"
                >
                  Sign up
                </button>
              </p>
            </section>
          )}

          {view === 'register' && (
            <section>
              <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
              <p className="mt-1 text-sm text-neutral-600">Get started with MeetMe in seconds.</p>

              <form
                className="mt-6 flex flex-col gap-4"
                onSubmit={(e) => { e.preventDefault(); registerCall()}}
              >
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Full name</span>
                  <input
                    required
                    type="text"
                    placeholder="jonathan jon"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Email</span>
                  <input
                    required
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Password</span>
                  <input
                    required
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                  />
                </label>

                <button
                  type="submit"
                  className="mt-2 w-full bg-neutral-900 text-white rounded-full py-2.5 text-sm font-medium
                             hover:bg-neutral-800 transition-all duration-200 cursor-pointer"
                >
                  Create account
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-neutral-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="font-medium text-neutral-900 hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            </section>
          )}

          {view === 'forgot' && (
            <section>
              <h2 className="text-2xl font-bold tracking-tight">Reset your password</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Enter your email and choose a new password.
              </p>

              <form
                className="mt-6 flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newPassword !== repeatNewPassword) {
                    toast.error("Passwords do not match.")
                    return;
                  }; resetPassword();
                }}
              >
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Email</span>
                  <input
                    required
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>New password</span>
                  <input
                    required
                    type="password"
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Repeat new password</span>
                  <input
                    required
                    type="password"
                    placeholder="Re-enter new password"
                    value={repeatNewPassword}
                    onChange={(e) => setRepeatNewPassword(e.target.value)}
                    className={inputClass}
                  />
                </label>

                <button
                  type="submit"
                  className="mt-2 w-full bg-neutral-900 text-white rounded-full py-2.5 text-sm font-medium
                             hover:bg-neutral-800 transition-all duration-200 cursor-pointer"
                >
                  Reset password
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-neutral-600">
                Remembered it?{' '}
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="font-medium text-neutral-900 hover:underline cursor-pointer"
                >
                  Back to sign in
                </button>
              </p>
            </section>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="w-11/12 max-w-6xl mx-auto px-2 py-8 border-t border-white/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-neutral-600">
        <span>© {new Date().getFullYear()} MeetMe</span>
        <span>Built for teams that meet a lot.</span>
      </footer>
    </div>
  )
}

export default App
