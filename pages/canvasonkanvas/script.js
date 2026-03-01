import { CoK } from './CoK.js';

const canvas2d = document.getElementById('base2d');
canvas2d.width = window.innerWidth;
canvas2d.height = window.innerHeight;
const cok = new CoK(canvas2d);

// Draw something in 2D
const ctx = cok.ctx2d;

function CloudBoom(ctx2d, {
    count = 40,
    minRadius = 15,
    maxRadius = 60,
    strokeWidth = 2,
    maxXLoc,
    maxYLoc,
    startX,
    startY,
    endX,
    endY,
} = {}) {
    const { width, height } = ctx2d.canvas;

    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

    const sx = clamp(startX ?? starX ?? 0, 0, width);
    const sy = clamp(startY ?? starY ?? 0, 0, height);

    const ex = clamp(endX ?? maxXLoc ?? width, 0, width);
    const ey = clamp(endY ?? maxYLoc ?? height, 0, height);

    const x0 = Math.min(sx, ex), x1 = Math.max(sx, ex);
    const y0 = Math.min(sy, ey), y1 = Math.max(sy, ey);

    ctx2d.save();
    ctx2d.fillStyle = "#fff";
    ctx2d.strokeStyle = "#000";
    ctx2d.lineWidth = strokeWidth;

    for (let i = 0; i < count; i += 1) {
        const radius = Math.random() * (maxRadius - minRadius) + minRadius;
        const x = x0 + Math.random() * (x1 - x0);
        const y = y0 + Math.random() * (y1 - y0);

        ctx2d.beginPath();
        ctx2d.arc(x, y, radius, 0, Math.PI * 2);
        ctx2d.fill();
        ctx2d.stroke();
        ctx2d.closePath();
    }

    ctx2d.restore();
}




bufferDemo(true);



const pixelationFs = `
    precision mediump float;

    varying vec2 v_texCoord;
    uniform sampler2D u_texture;
    uniform float u_blockSize;
    uniform vec2  u_resolution;

    void main(void) {
        vec2 pixelPos = v_texCoord * u_resolution;
        vec2 blockPos = floor(pixelPos / u_blockSize) * u_blockSize;
        vec2 snappedUV = blockPos / u_resolution;
        gl_FragColor = texture2D(u_texture, snappedUV);
    }
`;


cok.setFragmentShader(pixelationFs);

// After that, before draw/render, set uniforms using raw WebGL:
const gl = cok.gl;
const prog = cok.program;

gl.useProgram(prog);

const uBlockSizeLoc = gl.getUniformLocation(prog, "u_blockSize");
const uResolutionLoc = gl.getUniformLocation(prog, "u_resolution");

gl.uniform1f(uBlockSizeLoc, 4); // chunk size in pixels
gl.uniform2f(uResolutionLoc, cok.canvas2d.width, cok.canvas2d.height);

cok.render();



function drawTextAt(ctx2d, pos, text, {
  font = "16px system-ui",
  fill = "#000",
  stroke = null,
  lineWidth = 16,
  align = "center",
  baseline = "alphabetic",
  maxWidth = undefined,
} = {}) {
  const x = pos?.x ?? 0;
  const y = pos?.y ?? 0;

  ctx2d.save();
  ctx2d.font = font;
  ctx2d.textAlign = align;
  ctx2d.textBaseline = baseline;

  if (stroke) {
    ctx2d.lineWidth = lineWidth;
    ctx2d.strokeStyle = stroke;
    ctx2d.strokeText(text, x, y, maxWidth);
  }

  ctx2d.fillStyle = fill;
  ctx2d.fillText(text, x, y, maxWidth);
  ctx2d.restore();
}





function bufferDemo(cockOn) {
    ctx.fillStyle = "blue";
    ctx.fillRect(0, 0, canvas2d.width, canvas2d.height);
    drawTextAt(ctx, {x : window.innerWidth/2 , y : window.innerHeight/4}, "Canvas-On-Kanvas",{ fill: "#ffffffff", stroke: "#000000ff", font: "100px system-ui" });
    drawTextAt(ctx, {x : window.innerWidth/2 , y : window.innerHeight/3.5}, "C.o.K",{ fill: "#ffffffff", stroke: "#000000ff", font: "20px system-ui" });

    drawTextAt(ctx, {x : window.innerWidth/2 , y : window.innerHeight/2.5}, "Canvas-On-Kanvas Is A Simple Script That Allows GLSL Shaders On 2D Context-ed Canvas.",{ fill: "#ffffffff", stroke: "#000000e0", font: "30px system-ui" });
    drawTextAt(ctx, {x : window.innerWidth/2 , y : window.innerHeight/2.22}, "Simplely It Creates A Canvas With WebGL Active, Init's A Quad,",{ fill: "#ffffffff", stroke: "#000000e0", font: "30px system-ui" });
    drawTextAt(ctx, {x : window.innerWidth/2 , y : window.innerHeight/2.0}, "And Applies A Texture On It Using The Context2D's Current View.",{ fill: "#ffffffff", stroke: "#000000e0", font: "30px system-ui" });

    //And Applies A Texture On It Using The Context2D's Current View.
    drawTextAt(ctx, {x : window.innerWidth/2 , y : window.innerHeight/1.82}, "Bada-Bum, Applies The Given Shader On-Top Of It And You Get C.o.K.",{ fill: "#ffffffff", stroke: "#000000e0", font: "30px system-ui" });

    CloudBoom(ctx, {
        count: 1000,
        maxRadius: 10,
        strokeWidth: 8,
        maxXLoc: 650,
        maxYLoc: 300,
        startX: 0,
        endX  : 40,
        startY: 4,
        endY : window.innerHeight
    });
    CloudBoom(ctx, {
        count: 1000,
        maxRadius: 10,
        strokeWidth: 8,
        maxXLoc: 650,
        maxYLoc: 300,
        startX: window.innerWidth,
        endX  : window.innerWidth-40,
        startY: 4,
        endY : window.innerHeight
    });
    CloudBoom(ctx, {
        count: 1000,
        maxRadius: 10,
        strokeWidth: 8,
        maxXLoc: 650,
        maxYLoc: 300,
        startX: 0,
        endX  : window.innerWidth,
        startY: 0,
        endY : 40
    });
    CloudBoom(ctx, {
        count: 1000,
        maxRadius: 10,
        strokeWidth: 8,
        maxXLoc: 650,   
        maxYLoc: 300,
        startX: 0,
        endX  : window.innerWidth,
        startY: window.innerHeight-40,
        endY  : window.innerHeight+40
    });
    if(cockOn) {
        cok.render();
        canvas2d.nextElementSibling.style.display = "inline-block";
    }
    else{
        canvas2d.nextElementSibling.style.display = "none";
    }
}

let coktoggle = true; 

const cokToggleElement = document.getElementById("enabled-cok");


setInterval(()=>{
    bufferDemo(coktoggle);
},350);


 document.getElementById("coktoggle").addEventListener("click",(e)=>{
    coktoggle = !coktoggle
    if(coktoggle){
        cokToggleElement.id  = "enabled-cok";
        cokToggleElement.innerText = "ENABLED"
    }
    else{
        cokToggleElement.id  = "disabled-cok";
        cokToggleElement.innerText = "DISABLED"
    }
    bufferDemo(coktoggle);
});


window.addEventListener("resize", ()=>{
    canvas2d.width = window.innerWidth;
    canvas2d.height = window.innerHeight;
});