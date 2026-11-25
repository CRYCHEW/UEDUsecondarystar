import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.STAR_APP_SUPABASE;
const sb = createClient(cfg.url, cfg.publishableKey);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let user = null, profile = null, teachers = [], currentRequests = [], pendingLogin = null;
const reasons = [
  ['班级第 1 名',50],['班级第 2 名',40],['班级第 3 名',30],['班级第 4 名',20],['班级第 5 名',10],
  ['全年级前 10 名',50],['全年级第 11–20 名',40],['全年级第 21–30 名',30],['全年级第 31–40 名',20],['全年级第 41–50 名',10],
  ['科目成绩获得 A',10],['科目成绩获得 B',5],['单科成绩进步超过 10 分',10],['全年级名次进步 20 名',10],['全年级名次进步 50 名',25],['全年级名次进步 100 名或以上',50],
  ['1 科全勤 4 堂',2],['2 科全勤 8 堂',4],['出席补习班（每堂）',1],['按时完成作业（每次）',1],['交回老师批改的考卷（每科）',2],['Output 满分（每次）',5],['听写满分（每次）',5],['生日奖励',30],['其他学习表现（请说明）',0]
];
const subjects = ['BM','BI','BMK','ACC','AM','SEJ','CHE','EKO','GEO','RBT','MM','SC','BC','PHY','ASK','BIO'];
function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),3000); }
function todayKL(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function authModal(){
  $('#accountModal').innerHTML=`<div class="modal" style="max-width:500px"><div class="biometric-mark">🔐 ⭐</div><h2>学生注册与安全登入</h2><p>首次注册后系统自动生成学号。下次可用“华语全名＋学号＋已验证电话”登入；同一设备会保留登入状态。</p>
    <div class="fieldgroup"><label>登入身份</label><select class="field" id="authKind" style="width:100%"><option value="student">学生</option><option value="teacher">老师</option></select></div>
    <div id="studentAuthFields">
      <div class="fieldgroup" style="margin-top:10px"><label>学生操作</label><select class="field" id="studentMode" style="width:100%"><option value="register">首次注册</option><option value="student-id">已有学号登入</option><option value="recover-id">忘记学号？找回学号</option></select></div>
      <div class="fieldgroup" id="authNameGroup" style="margin-top:10px"><label>华语全名</label><input class="field" id="authName" autocomplete="name" placeholder="请输入学生华语全名" style="width:100%"></div>
      <div class="fieldgroup" id="authGradeGroup" style="margin-top:10px"><label>年级</label><select class="field" id="authGrade" style="width:100%"><option value="">请选择年级</option><option>Peralihan</option><option>Form 1</option><option>Form 2</option><option>Form 3</option><option>Form 4</option><option>Form 5</option></select></div>
      <div class="fieldgroup" id="authStudentNumberGroup" style="display:none;margin-top:10px"><label>学号</label><input class="field" id="authStudentNumber" autocomplete="username" placeholder="请输入注册后获得的学号" style="width:100%"></div>
      <div class="fieldgroup" style="margin-top:10px"><label>已验证的电话号码</label><input class="field" id="authPhone" type="tel" autocomplete="tel" placeholder="例如：+60123456789" style="width:100%"></div>
      <div class="fieldgroup" style="margin-top:10px"><label>验证码发送方式</label><select class="field" id="authChannel" style="width:100%"><option value="sms">短信 SMS</option><option value="whatsapp">WhatsApp</option></select></div>
    </div>
    <div id="teacherAuthFields" style="display:none"><div class="fieldgroup" style="margin-top:10px"><label>教师授权邮箱</label><input class="field" id="authEmail" type="email" placeholder="输入登记的教师邮箱" style="width:100%"></div><div class="login-note">请从邮箱打开 Supabase 发出的安全登录链接。总管理员：Ms Crystal。</div></div>
    <div id="otpFields" style="display:none;margin-top:10px"><div class="fieldgroup"><label>一次性验证码</label><input class="field" id="authOtp" inputmode="numeric" autocomplete="one-time-code" placeholder="输入收到的验证码" style="width:100%"></div></div>
    <div class="login-note" id="authMsg">学生首次注册请填写华语全名、年级和电话号码。验证电话后，系统自动生成学号；账号仍需管理员确认后才能签到和申请奖励星。</div>
    <div class="login-note" id="studentIdResult" style="display:none"></div>
    <div class="modal-actions"><button class="btn btn-outline" id="authClose">关闭</button><button class="btn" id="authSend">发送验证码</button><button class="btn" id="authVerify" style="display:none">验证并登入</button></div></div>`;
  const updateMode=()=>{
    const mode=$('#studentMode').value, isRegister=mode==='register', isIdLogin=mode==='student-id';
    $('#authNameGroup').style.display=mode==='recover-id'?'none':'';
    $('#authGradeGroup').style.display=isRegister?'':'none';
    $('#authStudentNumberGroup').style.display=isIdLogin?'':'none';
    $('#authMsg').textContent=isRegister?'首次注册请填写华语全名、年级和电话号码。验证电话后，系统自动生成学号；账号仍需管理员确认后才能签到和申请奖励星。':isIdLogin?'请填写已登记的华语全名、学号和电话号码，并通过电话验证码验证。':'请输入注册时的电话号码并验证；系统会显示对应的学号。';
    $('#studentIdResult').style.display='none';$('#otpFields').style.display='none';$('#authVerify').style.display='none';$('#authSend').style.display='';
  };
  $('#studentMode').onchange=updateMode;
  $('#authKind').onchange=()=>{const isStudent=$('#authKind').value==='student';$('#studentAuthFields').style.display=isStudent?'block':'none';$('#teacherAuthFields').style.display=isStudent?'none':'block';$('#otpFields').style.display='none';$('#authSend').style.display='';$('#authVerify').style.display='none';$('#authMsg').textContent=isStudent?'请按页面提示注册、登入或找回学号。':'只允许已登记在教师授权名单中的邮箱登入。'};
  $('#authClose').onclick=()=>$('#accountModal').classList.remove('show');
  $('#authSend').onclick=sendLogin;
  $('#authVerify').onclick=verifyStudent;
}
function normalizePhone(v){return String(v||'').replace(/[\s()-]/g,'')}
async function sendLogin(){
 try{
  const kind=$('#authKind').value;
  if(kind==='student'){
    const mode=$('#studentMode').value, phone=normalizePhone($('#authPhone').value);
    const name=$('#authName').value.trim(), grade=$('#authGrade').value, studentNumber=$('#authStudentNumber').value.trim().toUpperCase();
    if(!/^\+[1-9]\d{7,14}$/.test(phone)){toast('电话号码请使用国际格式，例如 +60123456789');return}
    if(mode==='register'&&(!name||!grade)){toast('请填写华语全名并选择年级');return}
    if(mode==='student-id'&&(!name||!studentNumber)){toast('请填写华语全名和学号');return}
    const options={channel:$('#authChannel').value,shouldCreateUser:mode==='register'};
    if(mode==='register') options.data={full_name:name,grade};
    const {error}=await sb.auth.signInWithOtp({phone,options}); if(error)throw error;
    pendingLogin={kind,mode,flow:mode,phone,name,grade,studentNumber,channel:$('#authChannel').value};
    $('#otpFields').style.display='block';$('#authVerify').style.display='';$('#authSend').textContent='重新发送验证码';
    $('#authMsg').textContent=`验证码已通过${$('#authChannel').selectedOptions[0].textContent}发送至该电话号码。`;
    toast('验证码已发送');
  }else{
    const email=$('#authEmail').value.trim().toLowerCase(); if(!email){toast('请输入教师邮箱');return}
    const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin}});if(error)throw error;
    pendingLogin={kind,email};$('#authMsg').textContent='登录链接已发送。请打开邮箱中的链接返回此页面；邮箱必须在教师授权名单内。';toast('安全登录链接已发送');
  }
 }catch(e){console.error(e);toast(e.message||'无法发送登录信息，请检查 Supabase Auth 设置')}
}
async function verifyStudent(){
 try{
  const attempt=pendingLogin,token=$('#authOtp').value.trim();if(!attempt?.phone||token.length<4){toast('请输入收到的验证码');return}
  const {error}=await sb.auth.verifyOtp({phone:attempt.phone,token,type:attempt.channel==='whatsapp'?'whatsapp':'sms'});if(error)throw error;
  const {data:{user:authUser},error:userError}=await sb.auth.getUser();if(userError||!authUser)throw userError||new Error('登入验证失败');
  const {data:record,error:profileError}=await sb.from('profiles').select('full_name,grade,phone,student_number,role,approved').eq('id',authUser.id).single();
  if(profileError||!record)throw profileError||new Error('找不到学生资料');
  if(record.role!=='student'||normalizePhone(record.phone)!==attempt.phone){await sb.auth.signOut();throw new Error('电话号码与学生登记资料不符')}
  if(attempt.mode==='register'&&(record.full_name.trim()!==attempt.name.trim()||record.grade!==attempt.grade)){await sb.auth.signOut();throw new Error('此电话号码已登记其他学生，请选择“已有学号登入”或“找回学号”')}
  if(attempt.mode==='student-id'&&(record.full_name.trim()!==attempt.name.trim()||String(record.student_number||'').toUpperCase()!==attempt.studentNumber)){await sb.auth.signOut();throw new Error('华语全名或学号不正确')}
  $('#accountModal').classList.remove('show');await loadSession();
  if(attempt.mode==='recover-id'){
    $('#authMsg').textContent='电话号码验证成功。请记下或截图保存你的学号。';
    $('#studentIdResult').innerHTML=`你的系统学号：<b>${esc(record.student_number||'尚未生成')}</b><br>年级：${esc(record.grade||'')}`;$('#studentIdResult').style.display='block';$('#otpFields').style.display='none';$('#authSend').style.display='none';$('#authVerify').style.display='none';$('#accountModal').classList.add('show');
    pendingLogin=null;return;
  }
  if(attempt.mode==='register'){
    $('#authMsg').textContent='注册成功。请记下或截图保存系统学号；管理员确认后即可使用签到和申请奖励星。';
    $('#studentIdResult').innerHTML=`你的系统学号：<b>${esc(record.student_number||'资料建立中')}</b><br>年级：${esc(record.grade||'')}`;$('#studentIdResult').style.display='block';$('#authSend').style.display='none';$('#authVerify').style.display='none';$('#accountModal').classList.add('show');
    pendingLogin=null;return;
  }
  pendingLogin=null;toast('登入成功');
 }catch(e){console.error(e);toast(e.message||'验证码无效或已过期')}
}
function setRoleUI(){
 const isStudent=profile?.role==='student', isTeacher=['teacher','admin'].includes(profile?.role);
 document.body.classList.add('auth-ready');$('#accountModal').classList.remove('show');
 $('#rolePill').textContent=profile?.role==='admin'?'总管理员':profile?.role==='teacher'?'科目老师':'学生账户';
 $('#avatar').textContent=(profile?.full_name||'?').slice(0,1);
 $('#loginBtn').textContent='退出登入'; $('#loginBtn').onclick=async()=>{await sb.auth.signOut();location.reload()};
 document.querySelectorAll('.nav').forEach(b=>{const adminOnly=['roster'].includes(b.dataset.page);const teacherOnly=['admin'].includes(b.dataset.page);b.style.display=(adminOnly?profile?.role==='admin':teacherOnly?isTeacher:isStudent)?'flex':'none'});
 if(!isTeacher){go('home')}else{go('admin');$('#page-admin .date').textContent=profile.role==='admin'?'总管理员：Ms Crystal':'科目老师：'+profile.full_name}
 $('#page-home h1').textContent=`早上好，${profile?.full_name||''} ✨`;
 if(isStudent&&!profile.approved){$('#checkBtn').disabled=true;$('#checkTitle').textContent='账号等待老师确认';$('#checkDesc').textContent='确认后即可签到及申请奖励星';$('#requestForm').querySelector('button[type=submit]').disabled=true;}
 if(profile?.role==='admin'){$('#page-admin .cards3 .stat:nth-child(3) strong').textContent='全部科目'}
}
function go(page){document.querySelectorAll('.section').forEach(x=>x.classList.remove('active'));$('#page-'+page)?.classList.add('active');document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page===page));window.scrollTo({top:0,behavior:'smooth'})}
async function loadSession(){
 const {data:{session}}=await sb.auth.getSession(); user=session?.user||null;
 if(!user){document.body.classList.remove('auth-ready');$('#accountModal').classList.add('show');return}
 const {data,error}=await sb.from('profiles').select('*').eq('id',user.id).single();
 if(error||!data){console.error(error);await sb.auth.signOut();toast('账号尚未建立档案，请确认数据库设置后重试');document.body.classList.remove('auth-ready');$('#accountModal').classList.add('show');return}
 profile=data;setRoleUI();await loadTeachers();await refreshData();
}
async function loadTeachers(){const {data,error}=await sb.from('teacher_accounts').select('user_id,display_name,subjects,role').order('display_name');if(error)throw error;teachers=data||[];
 $('#teacher').innerHTML='<option value="">请选择老师</option>'+teachers.map(t=>`<option value="${t.user_id}">${esc(t.display_name)}</option>`).join('');
 $('#subject').onchange=()=>{const subj=$('#subject').value;const list=teachers.filter(t=>t.subjects.includes(subj));$('#teacher').innerHTML='<option value="">请选择老师</option>'+list.map(t=>`<option value="${t.user_id}">${esc(t.display_name)}</option>`).join('')};
 const tbody=$('#teacherAccountRows');if(tbody)tbody.innerHTML=teachers.map(t=>`<tr><td>${esc(t.display_name)}</td><td>${esc(t.email||'已授权邮箱')}</td><td>${t.subjects.map(esc).join(' · ')||'全部科目'}</td><td>${t.role==='admin'?'<span class="status ok">总管理员</span>':'<span class="tag">科目老师</span>'}</td></tr>`).join('');
}
async function refreshData(){
 if(profile.role==='student'){
   const [{data:ledger,error:e1},{data:reqs,error:e2},{data:check,error:e3}]=await Promise.all([
    sb.from('star_ledger').select('amount,reason,source,created_at').eq('student_id',user.id).order('created_at',{ascending:false}),
    sb.from('star_requests').select('id,subject,reason,details,requested_stars,approved_stars,status,created_at,teacher_accounts(display_name)').eq('student_id',user.id).order('created_at',{ascending:false}),
    sb.from('daily_checkins').select('id').eq('student_id',user.id).eq('local_date',todayKL()).maybeSingle()
   ]); if(e1||e2||e3)throw e1||e2||e3;
   const rows=ledger||[], total=rows.reduce((a,x)=>a+x.amount,0);$('#balance').textContent=total;$('#historyBalance').textContent=total;$('#earnedTotal').textContent=rows.filter(x=>x.amount>0).reduce((a,x)=>a+x.amount,0);
   $('#checkBtn').disabled=!!check||!profile.approved;$('#checkBtn').textContent=check?'已签到 ✓':'签到 +1 ⭐';$('#checkTitle').textContent=check?'今日签到已完成':profile.approved?'完成今日签到':'账号等待老师确认';$('#checkDesc').textContent=check?'奖励星已加入你的余额':'周一至周五，每日限签到一次';
   currentRequests=reqs||[];const pending=currentRequests.filter(r=>r.status==='pending').length;$('#pendingTotal').textContent=pending;
   $('#homeRequests').innerHTML=currentRequests.slice(0,2).map(requestRow).join('')||'<div class="empty">还没有申请记录</div>';
   $('#allHistory').innerHTML=rows.map(x=>`<div class="row"><div class="row-left"><div class="row-icon">⭐</div><div><div class="row-title">${esc(x.reason)}</div><div class="row-sub">${new Date(x.created_at).toLocaleDateString('zh-CN',{timeZone:'Asia/Kuala_Lumpur'})}</div></div></div><span class="amount">${x.amount>0?'+':''}${x.amount} ⭐</span></div>`).join('')+currentRequests.map(requestRow).join('');
 }else{
   const q=sb.from('star_requests').select('id,student_name,student_id,subject,reason,details,requested_stars,status,created_at');
   const {data,error}=await (profile.role==='admin'?q:q.in('subject',profileSubjects()));if(error)throw error;
   currentRequests=data||[];renderAdminData();
   if(profile.role==='admin') await renderStudentApprovals();
 }
}
async function renderStudentApprovals(){
 const {data,error}=await sb.from('profiles').select('id,full_name,grade,phone,student_number,approved,created_at').eq('role','student').order('created_at');
 if(error)throw error;
 const target=$('#studentApprovalRows'); if(!target)return;
 target.innerHTML=(data||[]).map(s=>`<tr><td class="student">${esc(s.full_name)}</td><td>${esc(s.grade)}</td><td>${esc(s.phone)}</td><td>${esc(s.student_number)}</td><td>${s.approved?'<span class="status ok">已确认</span>':'<button class="btn btn-sm" data-approve-student="'+s.id+'">确认学生</button>'}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">目前还没有学生注册</td></tr>';
 target.querySelectorAll('[data-approve-student]').forEach(b=>b.onclick=async()=>{const {error}=await sb.rpc('approve_student',{p_student_id:b.dataset.approveStudent});if(error){toast(error.message);return}toast('学生账号已确认');await renderStudentApprovals()});
}
function profileSubjects(){const own=teachers.find(t=>t.user_id===user.id);return own?.subjects||[]}
function requestRow(r){const status={pending:'待审核',approved:'已批准',rejected:'已拒绝'}[r.status]||r.status;return `<div class="row"><div class="row-left"><div class="row-icon">✧</div><div><div class="row-title">${esc(r.reason)}</div><div class="row-sub">${esc(r.subject)} · ${esc(r.teacher_accounts?.display_name||'老师审核')}</div></div></div><span class="status ${r.status==='approved'?'ok':r.status==='rejected'?'no':'wait'}">${status}</span></div>`}
function renderAdminData(){const pending=currentRequests.filter(r=>r.status==='pending');$('#adminPending').textContent=pending.length;const own=profileSubjects();$('#adminRows').innerHTML=pending.length?pending.map(r=>`<tr><td class="student">${esc(r.student_name)}</td><td><span class="tag">${esc(r.subject)}</span></td><td>${esc(r.reason)}</td><td>${esc(r.details)}</td><td><b>${r.requested_stars} ⭐</b></td><td><button class="btn btn-sm" data-review="${r.id}">审核</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty">目前没有待审核申请</td></tr>';
 $('#page-admin .cards3 .stat:nth-child(3) strong').textContent=profile.role==='admin'?'全部科目':own.join(' · ');document.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>openSecureApproval(b.dataset.review));}
async function openSecureApproval(id){const r=currentRequests.find(x=>x.id===id);if(!r)return;const v=prompt(`学生：${r.student_name}\n科目：${r.subject}\n理由：${r.reason}\n申请：${r.requested_stars} 颗\n\n输入批准颗数；输入 0 拒绝：`);if(v===null)return;const stars=Number(v);if(!Number.isInteger(stars)||stars<0||stars>100){toast('请输入 0 至 100 的整数');return}const {error}=await sb.rpc('review_star_request',{p_request_id:id,p_approve:stars>0,p_stars:stars});if(error){toast(error.message);return}toast(stars?'已批准并发放奖励星':'申请已拒绝');await refreshData();}
async function sendCheckin(){if(!profile.approved){toast('账号需先经总管理员确认');return}const {error}=await sb.rpc('check_in_today');if(error){toast(error.message);return}document.querySelector('#checkBtn').disabled=true;document.querySelector('#checkBtn').textContent='已签到 ✓';await refreshData();toast('签到成功，获得 1 颗奖励星');}
async function submitRequest(e){e.preventDefault();if(!profile.approved){toast('账号需先经总管理员确认');return}const stars=Number($('#stars').value);const {error}=await sb.rpc('submit_star_request',{p_subject:$('#subject').value,p_teacher_id:$('#teacher').value,p_reason:$('#reason').selectedOptions[0].textContent,p_details:$('#details').value.trim(),p_stars:stars});if(error){toast(error.message);return}e.target.reset();await refreshData();go('home');toast('申请已提交，等待科目老师审核')}
function bindApp(){
 document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{if(b.style.display==='none')return;go(b.dataset.page)});
 document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
 $('#loginBtn').onclick=()=>sb.auth.signOut().then(()=>location.reload());
 $('#checkBtn').onclick=sendCheckin;$('#requestForm').onsubmit=submitRequest;
 $('#reason').onchange=()=>{const n=$('#reason').selectedOptions[0]?.dataset.stars;$('#stars').value=n||''};
}
authModal();bindApp();
$('#todayDate').textContent=new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Kuala_Lumpur'}).format(new Date());
sb.auth.onAuthStateChange((_event)=>{loadSession().catch(e=>{console.error(e);toast(e.message||'连接 Supabase 失败')})});
loadSession().catch(e=>{console.error(e);toast('Supabase 尚未准备完成：请先运行数据库脚本并启用认证服务')});
