(function(){
  const stepEls = [
    document.getElementById('step1'),
    document.getElementById('step2'),
    document.getElementById('step3'),
  ];
  const progress = document.getElementById('progressBar');
  const levelInputs = document.querySelectorAll('input[name="level"]');
  let step = 1;

  function showStep(n){
    stepEls.forEach((el,i)=> el.style.display = (i===n-1)?'block':'none');
    if(progress){ progress.style.width = ((n/3)*100)+'%';}
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    if(n<3){ nextBtn.classList.remove('d-none'); submitBtn.classList.add('d-none'); }
    else{ nextBtn.classList.add('d-none'); submitBtn.classList.remove('d-none'); }
  }

  function validateStep(n){
    if(n===1){
      const req = ['first_name','last_name','username','email','password'];
      for(const id of req){
        const v = document.getElementById(id).value.trim();
        if(!v){ alert('Please fill: '+id.replace('_',' ')); return false; }
      }
      return true;
    }
    if(n===2){
      let chosen = false;
      levelInputs.forEach(i=>{ if(i.checked) chosen=true; });
      if(!chosen){ alert('Please select your current level.'); }
      return chosen;
    }
    return true;
  }

  document.getElementById('nextBtn')?.addEventListener('click', function(){
    if(!validateStep(step)) return;
    step = Math.min(3, step+1);
    showStep(step);
  });

  // init
  showStep(step);
})();