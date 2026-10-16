import {test as base,expect} from '@playwright/test';
const test=base.extend({page:async({page},use)=>{
  if(process.env.E2E_API_URL)await page.route('**/api/**',route=>{
    const original=new URL(route.request().url());
    return route.continue({url:process.env.E2E_API_URL+original.pathname+original.search});
  });
  await use(page);
}});

test('signup fits a desktop viewport without page scrolling',async({page})=>{
  const hydrationErrors:string[]=[];
  page.on('console',message=>{
    if(/hydrat|server rendered HTML didn't match/i.test(message.text()))hydrationErrors.push(message.text());
  });
  await page.setViewportSize({width:1366,height:768});
  await page.goto('/signup');
  await expect(page.getByRole('button',{name:'Create account',exact:true})).toBeVisible();
  await expect(page.getByLabel('Date of birth',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Date of birth',{exact:true})).toHaveAttribute('max',/^\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByLabel('Gender',{exact:true})).toBeVisible();
  for(const role of ['patient','doctor','admin']){
    await page.getByRole('combobox',{name:'Account role',exact:true}).selectOption(role);
    const fits=await page.evaluate(()=>document.documentElement.scrollHeight<=window.innerHeight);
    expect(fits).toBeTruthy();
  }
  await page.screenshot({path:'test-results/signup-desktop.png',fullPage:true});
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Welcome back',exact:true})).toBeVisible();
  const password=page.getByLabel('Password',{exact:true});
  await password.fill('VisibilityCheck!2026');
  await page.getByRole('button',{name:'Show password',exact:true}).click();
  await expect(password).toHaveAttribute('type','text');
  await expect(password).toHaveValue('VisibilityCheck!2026');
  await page.getByRole('button',{name:'Hide password',exact:true}).click();
  await expect(password).toHaveAttribute('type','password');
  await expect(page.getByRole('heading',{name:'Welcome back',exact:true})).toBeVisible();
  await password.clear();
  await page.screenshot({path:'test-results/signin-desktop.png',fullPage:true});
  expect(hydrationErrors).toEqual([]);
});

test('doctor and admin signup require review before sign-in',async({page})=>{
  const accounts=[];
  for(const role of ['doctor','admin']){
    const email=`staff-${role}-${Date.now()}@example.com`;
    await page.goto('/signup');
    await page.getByRole('combobox',{name:'Account role',exact:true}).selectOption(role);
    await page.getByLabel('First name',{exact:true}).fill('Requested');
    await page.getByLabel('Last name',{exact:true}).fill(role);
    await page.getByLabel('Email',{exact:true}).fill(email);
    await page.getByLabel('Password',{exact:true}).fill('StrongStaffPassword!2026');
    await page.getByLabel('Confirm password',{exact:true}).fill('StrongStaffPassword!2026');
    await page.getByRole('button',{name:'Request staff account',exact:true}).click();
    await expect(page.getByRole('status')).toContainText('must approve staff access');
    accounts.push({role,email});
  }
  await login(page,'Admin');
  await page.getByRole('button',{name:'Accounts',exact:true}).click();
  for(const account of accounts){
    await page.getByRole('textbox',{name:'Search Accounts',exact:true}).fill(account.email);
    const row=page.getByRole('row').filter({has:page.getByRole('cell',{name:account.email,exact:true})});
    await row.getByRole('button',{name:'Approve signup',exact:true}).click();
    if(account.role==='doctor'){
      await page.getByLabel('Department').selectOption('dept-cardio');
      await page.getByLabel('Specialisation').fill('Cardiology');
    }
    await page.getByRole('button',{name:'Confirm',exact:true}).click();
    await expect(row.getByText('approved',{exact:true})).toBeVisible();
  }
});

test('patient signup validates confirmation and opens an isolated dashboard',async({page})=>{
  await page.goto('/');
  await page.getByRole('link',{name:'Create an account',exact:true}).click();
  await expect(page).toHaveURL(/\/signup$/);
  const email=`signup-${Date.now()}@example.com`;
  await page.getByLabel('First name',{exact:true}).fill('Signup');
  await page.getByLabel('Last name',{exact:true}).fill('Browser Patient');
  await page.getByLabel('Email',{exact:true}).fill(email);
  await page.getByRole('combobox',{name:'Account role',exact:true}).selectOption('patient');
  await page.getByLabel('Password',{exact:true}).fill('StrongPatientPassword!2026');
  await page.getByLabel('Confirm password',{exact:true}).fill('DifferentPassword!2026');
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:'Passwords must match.'})).toHaveText('Passwords must match.');
  await page.getByLabel('Confirm password',{exact:true}).fill('StrongPatientPassword!2026');
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Welcome, Signup',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Medical reports',exact:true}).click();
  await expect(page.getByText('No records available',{exact:true})).toBeVisible();
  await expect(page.getByText('John laboratory report',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await page.getByLabel('Email',{exact:true}).fill(email);
  await page.getByLabel('Password',{exact:true}).fill('StrongPatientPassword!2026');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Welcome, Signup',exact:true})).toBeVisible();
});

async function login(page:any,role='Patient') {
  await page.goto('/');
  await page.getByRole('button',{name:`${role} demo`,exact:true}).click();
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('button',{name:'Sign out',exact:true})).toBeVisible();
}
test('patient sees own records and cited hospital answers',async({page})=>{
  await login(page);
  await expect(page.getByRole('cell',{name:'Dr. Sarah Lin',exact:true})).toBeVisible();
  await page.screenshot({path:'test-results/patient-dashboard.png',fullPage:true});
  await page.getByRole('button',{name:'Medical reports',exact:true}).click();
  await expect(page.getByText('John laboratory report',{exact:true})).toBeVisible();
  await expect(page.getByText('Priya private report',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'AI assistant',exact:true}).click();
  await page.getByRole('textbox',{name:'Message',exact:true}).fill('What are the visiting hours?');
  await page.getByRole('button',{name:'Send message'}).click();
  await expect(page.getByText('Local demo — authorised tool result:',{exact:false})).toBeVisible({timeout:20000});
  await expect(page.getByRole('button',{name:/Hospital visiting hours · v1/})).toBeVisible();
  await page.getByRole('textbox',{name:'Message',exact:true}).fill('Show the report for Priya Rao');
  await page.getByRole('button',{name:'Send message'}).click();
  await expect(page.getByText('Access to this resource is not permitted.',{exact:true})).toBeVisible();
});
test('doctor sees assigned patient and admin manages access separately',async({page})=>{
  await login(page,'Doctor');
  await page.getByRole('button',{name:'Patients',exact:true}).click();
  await expect(page.getByRole('cell',{name:'John Doe',exact:true})).toBeVisible();
  await expect(page.getByRole('cell',{name:'Priya Rao',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Sign out'}).click();
  await login(page,'Admin');
  await page.getByRole('button',{name:'Care access',exact:true}).click();
  await expect(page.getByRole('cell',{name:'Dr. Sarah Lin',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Medical reports',exact:true}).click();
  await expect(page.getByText('No records available',{exact:true})).toBeVisible();
});
test('booking and cancellation persist through refresh',async({page})=>{
  const reason=`Browser test consultation ${Date.now()}`;
  await login(page);
  await page.getByRole('button',{name:'Appointments',exact:true}).click();
  await page.getByRole('button',{name:'Book appointment',exact:true}).click();
  await page.getByLabel('Available appointment slot').selectOption({index:1});
  await page.getByLabel('Reason for visit').fill(reason);
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('textbox',{name:'Search Appointments',exact:true}).fill(reason);
  await expect(page.getByRole('cell',{name:reason,exact:true})).toBeVisible();
  await page.reload();
  await page.getByRole('button',{name:'Appointments',exact:true}).click();
  await page.getByRole('textbox',{name:'Search Appointments',exact:true}).fill(reason);
  const row=page.getByRole('row').filter({has:page.getByRole('cell',{name:reason,exact:true})});
  await expect(row).toBeVisible();
  await row.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await expect(row.getByText('cancelled',{exact:true})).toBeVisible();
});

test('mobile navigation keeps the workspace usable',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await login(page);
  await page.getByRole('button',{name:'Open navigation'}).click();
  await page.getByRole('button',{name:'AI assistant',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Message',exact:true})).toBeVisible();
  const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth);
  expect(noOverflow).toBeTruthy();
});
