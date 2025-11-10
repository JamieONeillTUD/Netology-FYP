
// 3-step signup wizard using pure JS + CSS fades
(function(){
  const s1 = document.getElementById('step1');
  const s2 = document.getElementById('step2');
  const s3 = document.getElementById('step3');
  const steps = [s1,s2,s3];
  const progress = document.getElementById('progressBar');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  const levelInputs = document.querySelectorAll('input[name="level"]');
  let step = 1;

  steps.forEach(el=>el.classList.add('fade-step'));

  function setProgress(n){ if(progress){ progress.style.width = ((n/3)*100)+'%'; } }
  function showStep(n){
    steps.forEach((el,i)=> el.classList.toggle('show', i === (n-1)));
    setProgress(n);
    if(n<3){ nextBtn.classList.remove('d-none'); submitBtn.classList.add('d-none'); }
    else{ nextBtn.classList.add('d-none'); submitBtn.classList.remove('d-none'); }
  }

  function validateStep(n){
    if(n===1){
      const req=['first_name','last_name','username','email','password'];
      for(const id of req){
        const v = document.getElementById(id)?.value.trim();
        if(!v){ alert('Please fill: '+id.replace('_',' ')); return false; }
      }
      const email=document.getElementById('email').value;
      if(!email.includes('@')){ alert('Please enter a valid email.'); return false; }
      if(document.getElementById('password').value.length<8){ alert('Password must be at least 8 characters.'); return false; }
      return true;
    }
    if(n===2){
      let chosen=false; levelInputs.forEach(i=>{ if(i.checked) chosen=true; });
      if(!chosen){ alert('Please select your networking level.'); }
      return chosen;
    }
    return true;
  }

  nextBtn?.addEventListener('click', function(){
    if(!validateStep(step)) return;
    step=Math.min(3, step+1);
    showStep(step);
  });

  // init
  showStep(step);
})();
