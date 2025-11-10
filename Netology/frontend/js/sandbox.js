
(function(){
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const tips = document.getElementById('tips');
  const props = document.getElementById('props');
  let tool = 'select';
  let nodes = []; // {id,type,x,y,label,ip}
  let edges = []; // [aId,bId]
  let selectedId = null;
  let connecting = {start:null};

  const btns = document.querySelectorAll('[data-tool]');
  btns.forEach(b=>b.addEventListener('click', ()=>{
    tool = b.getAttribute('data-tool');
    tips.textContent = tool==='connect' ? 'Tip: Click two devices to connect.' :
                      tool==='select' ? 'Tip: Click a device to select it.' :
                      `Tip: Click on the canvas to place a ${tool}.`;
  }));

  document.getElementById('clearBtn').onclick = ()=>{
    if(confirm('Clear the canvas?')){ nodes=[]; edges=[]; selectedId=null; draw(); showProps(); }
  };
  document.getElementById('exportBtn').onclick = ()=>{
    const link = document.createElement('a');
    link.download = 'netology-sandbox.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  canvas.addEventListener('click', (e)=>{
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if(tool==='router' || tool==='switch' || tool==='pc'){
      const id = Date.now()+Math.random();
      const label = `${tool.charAt(0).toUpperCase()+tool.slice(1)} ${nodes.filter(n=>n.type===tool).length+1}`;
      nodes.push({id,type:tool,x,y,label,ip:''});
      draw();
      return;
    }

    const hit = hitTest(x,y);
    if(tool==='select'){
      selectedId = hit? hit.id : null;
      draw(); showProps();
    } else if(tool==='connect'){
      if(hit){
        if(!connecting.start){ connecting.start = hit.id; tips.textContent='Select another device to connect.'; }
        else if(connecting.start !== hit.id){
          edges.push([connecting.start, hit.id]);
          connecting.start = null;
          tips.textContent='Connected! Use Select to move or edit.';
          draw();
        }
      }
    }
  });

  let dragging = false; let offsetX=0, offsetY=0;
  canvas.addEventListener('mousedown', (e)=>{
    if(tool!=='select') return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const hit = hitTest(x,y);
    if(hit){
      selectedId = hit.id;
      dragging = true;
      offsetX = x - hit.x;
      offsetY = y - hit.y;
      showProps();
      draw();
    }
  });
  canvas.addEventListener('mousemove', (e)=>{
    if(!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const n = nodes.find(n=>n.id===selectedId);
    if(n){ n.x = x - offsetX; n.y = y - offsetY; draw(); }
  });
  window.addEventListener('mouseup', ()=> dragging=false);

  function hitTest(x,y){
    for(let i=nodes.length-1;i>=0;i--){
      const n=nodes[i];
      if(Math.hypot(n.x-x, n.y-y) < 24) return n;
    }
    return null;
  }

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // edges
    edges.forEach(([a,b])=>{
      const A = nodes.find(n=>n.id===a), B = nodes.find(n=>n.id===b);
      if(!A || !B) return;
      ctx.beginPath();
      ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    });
    // nodes
    nodes.forEach(n=>{
      ctx.beginPath();
      ctx.arc(n.x,n.y,24,0,Math.PI*2);
      ctx.fillStyle = '#E0F2F7';
      ctx.fill(); ctx.strokeStyle = '#00838F'; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle='#000'; ctx.font='12px Arial'; ctx.textAlign='center';
      ctx.fillText(icon(n.type), n.x, n.y+4);
      ctx.fillText(n.label, n.x, n.y+40);
      if(n.id===selectedId){
        ctx.strokeStyle='#FF9800'; ctx.setLineDash([5,3]);
        ctx.strokeRect(n.x-28, n.y-28, 56, 56);
        ctx.setLineDash([]);
      }
    });
  }

  function icon(type){
    if(type==='router') return '🛜';
    if(type==='switch') return '🔀';
    return '💻';
  }

  function showProps(){
    const n = nodes.find(n=>n.id===selectedId);
    if(!n){ props.innerHTML='No selection'; return; }
    props.innerHTML = `
      <div class="mb-2"><strong>Type:</strong> ${n.type}</div>
      <div class="mb-2">
        <label class="form-label small">Name</label>
        <input class="form-control form-control-sm" id="p_name" value="${n.label}"/>
      </div>
      <div class="mb-2">
        <label class="form-label small">IP</label>
        <input class="form-control form-control-sm" id="p_ip" value="${n.ip}" placeholder="192.168.1.10"/>
      </div>
      <div class="d-grid gap-2 mt-2">
        <button class="btn btn-sm btn-outline-danger" id="delBtn">Delete</button>
      </div>
    `;
    document.getElementById('p_name').oninput = (e)=>{ n.label = e.target.value; draw(); };
    document.getElementById('p_ip').oninput = (e)=>{ n.ip = e.target.value; };
    document.getElementById('delBtn').onclick = ()=>{
      if(confirm('Delete this device?')){
        nodes = nodes.filter(x=>x.id!==n.id);
        edges = edges.filter(([a,b])=> a!==n.id && b!==n.id);
        selectedId = null; draw(); showProps();
      }
    };
  }

  draw();
})();
