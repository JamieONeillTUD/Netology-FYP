
(function(){
  const backend="http://127.0.0.1:5000";
  const s1=document.getElementById('step1'),s2=document.getElementById('step2'),s3=document.getElementById('step3');
  const steps=[s1,s2,s3],progress=document.getElementById('progressBar'),next=document.getElementById('nextBtn'),submit=document.getElementById('submitBtn');
  let step=1;steps.forEach(el=>el.classList.add('fade-step'));
  function show(n){steps.forEach((el,i)=>el.classList.toggle('show',i===n-1));progress.style.width=((n/3)*100)+'%';if(n<3){next.classList.remove('d-none');submit.classList.add('d-none');}else{next.classList.add('d-none');submit.classList.remove('d-none');}}
  next.addEventListener('click',()=>{step=Math.min(3,step+1);show(step);});
  show(step);
})();