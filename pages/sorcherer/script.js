import * as THREE from "three";
import { Cell, JThree } from "jailedthreejs";
import { Sorcherer } from "sorcherer";

const realmElm = document.querySelector("realm");

const cell_elm = document.getElementById("cell-demo");
const cell_demo = Cell.getCell(cell_elm);

const cube_demo_elm = document.getElementById ("cubeForDemo");
const cube_demo     = cell_demo.getConvictById("cubeForDemo");
const main_cam      = cell_demo.getConvictById("main-cam");



cell_demo.addUpdateFunction(()=>{
    cube_demo.lookAt(main_cam.position.x,
                 main_cam.position.y-2,
                 main_cam.position.z
    );
});
Sorcherer.bootstrap(cell_demo.loadedScene, cell_demo.focusedCamera, cell_demo.threeRenderer,{
    interval:       4,
    autoAttach:     true,
    autoRegister:   true
});

setTimeout(() => {
    const GUI_div = document.getElementById("demo-header");
    GUI_div.style.width = (window.innerWidth*0.5) + "px";
    GUI_div.style.height = (window.innerHeight*0.65) + "px";

    const all = [...document.querySelectorAll("details")];

    all.forEach(d => {
        d.addEventListener("toggle", () => {
        if (!d.open) return;
        for (const other of all) if (other !== d) other.open = false;
        });
    });

    const allbtns = [...document.querySelectorAll("button")];

    allbtns.forEach((btn, i) => {
        btn.addEventListener("click",()=>{
            runChangeCSSKeyframe();
            runChangeCSSKeyframe("magic"+i);
        })
    });
	// I feel like I deleted something here accidentally.....
}, 1);




function runChangeCSSKeyframe(keyframeName = "none") {
    cube_demo_elm.style.setProperty("--animation", keyframeName);
}
