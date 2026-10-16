import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {useNavigate} from 'react-router-dom';
import {Activity, Eye, EyeOff} from 'lucide-react';
import {Button} from './ui/button';
import {post, setCsrf} from '../lib/api';
import AuthLayout from './AuthLayout';

export default function SignupForm() {
  const navigate=useNavigate();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [showPassword,setShowPassword]=useState(false);
  const [role,setRole]=useState('patient');
  const [pendingMessage,setPendingMessage]=useState('');
  const [today,setToday]=useState('');
  useEffect(()=>{
    // Use the hospital timezone and explicit ISO ordering for the date limit.
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const datePart=(type:string)=>parts.find(part=>part.type===type)?.value||'';
    setToday(`${datePart('year')}-${datePart('month')}-${datePart('day')}`);
  },[]);
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const password=String(form.get('password')||'');
    const confirmation=String(form.get('confirm_password')||'');
    const firstName=String(form.get('first_name')||'').trim().replace(/\s+/g,' ');
    const lastName=String(form.get('last_name')||'').trim().replace(/\s+/g,' ');
    if(!firstName||!lastName){setError('Enter your first name and last name.');return;}
    const name=`${firstName} ${lastName}`;
    if(name.length>150){setError('Keep your first and last names within 150 characters in total.');return;}
    if(password!==confirmation){setError('Passwords must match.');return;}
    setError('');setBusy(true);
    try {
      const result=await post('/auth/signup',{
        name,email:String(form.get('email')||'').trim(),
        role,
        password,confirm_password:confirmation,phone:String(form.get('phone')||'').trim(),
        dob:role==='patient'?(String(form.get('dob')||'')||null):null,
        gender:role==='patient'?String(form.get('gender')||''):'',
      });
      if(result.status==='pending'){setPendingMessage(`${result.message} Your account ID: ${result.account_id}.`);setBusy(false);return;}
      setCsrf(result.csrf_token);
      navigate('/');
    }catch(exc){setError(exc instanceof Error?exc.message:'Could not create your account.');setBusy(false);}
  }
  return <AuthLayout>
    <div className="w-full max-w-lg">
      <Link to="/" className="mb-4 flex items-center gap-3"><div className="rounded-lg bg-sky-700 p-2 text-white"><Activity size={24}/></div><div><span className="text-xl font-semibold text-slate-900">CareNexus</span><p className="text-xs text-slate-500">Hospital management & patient assistance</p></div></Link>
      <h1 className="text-xl font-semibold text-slate-900">Create your account</h1>
      <p className="mt-1 text-sm text-slate-500">Get started with your hospital workspace.</p>
      {pendingMessage?<div role="status" className="mt-5 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">{pendingMessage}<Link to="/" className="mt-4 block font-medium underline">Return to sign in</Link></div>:<form onSubmit={submit} className="mt-4 space-y-2 [&_.form-input]:h-9 [&_.form-input]:py-1.5!">
        <fieldset disabled={busy} className="grid grid-cols-2 gap-x-3 gap-y-2">
          <label className="col-span-2 block text-sm font-medium">Account role<select name="role" value={role} onChange={event=>setRole(event.target.value)} className="form-input"><option value="patient">Patient</option><option value="doctor">Doctor</option><option value="admin">Admin</option></select></label>
          <label className="block text-sm font-medium">First name<input name="first_name" required maxLength={150} autoComplete="given-name" className="form-input"/></label>
          <label className="block text-sm font-medium">Last name<input name="last_name" required maxLength={150} autoComplete="family-name" className="form-input"/></label>
          <label className="block text-sm font-medium">Email<input name="email" type="email" required maxLength={254} autoComplete="email" className="form-input"/></label>
          <label className="block text-sm font-medium">Phone <span className="font-normal text-slate-400">(optional)</span><input name="phone" type="tel" maxLength={30} autoComplete="tel" className="form-input"/></label>
          {role==='patient'&&<>
            <label className="block text-sm font-medium">Date of birth<input name="dob" type="date" max={today||undefined} autoComplete="bday" className="form-input"/></label>
            <div><label htmlFor="signup-gender" className="block text-sm font-medium">Gender</label><select id="signup-gender" name="gender" autoComplete="sex" className="form-input"><option value="">Select gender (optional)</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option><option value="Prefer not to say">Prefer not to say</option></select></div>
          </>}
          <div><label htmlFor="signup-password" className="block text-sm font-medium">Password</label><div className="relative"><input id="signup-password" name="password" type={showPassword?'text':'password'} required minLength={12} maxLength={128} autoComplete="new-password" className="form-input pr-12"/><button type="button" aria-label={showPassword?'Hide password':'Show password'} aria-pressed={showPassword} aria-controls="signup-password" onClick={()=>setShowPassword(!showPassword)} className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded text-slate-500 focus-visible:outline-2 focus-visible:outline-sky-600">{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>
          <label className="block text-sm font-medium">Confirm password<input name="confirm_password" type={showPassword?'text':'password'} required minLength={12} maxLength={128} autoComplete="new-password" className="form-input"/></label>
        </fieldset>
        <p className="text-xs text-slate-500">Use at least 12 characters for your password.</p>
        {error&&<p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <Button className="w-full" disabled={busy}>{busy?'Submitting…':role==='patient'?'Create account':'Request staff account'}</Button>
      </form>}
      <p className="mt-4 text-center text-sm text-slate-500">Already have an account? <Link to="/" className="font-medium text-sky-700 hover:underline">Sign in</Link></p>
      <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">Patient signup is immediate. Doctor and Admin accounts require hospital approval.</p>
    </div>
  </AuthLayout>;
}
