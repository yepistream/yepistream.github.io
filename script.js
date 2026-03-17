import * as THREE from "three";
import { Cell, JThree } from "jailedthreejs";
import { Sorcherer } from "sorcherer";

const realmElm = document.querySelector("realm");

const root_cell_elm = document.getElementById("root-cell");
const root_cell_object = Cell.getCell(root_cell_elm);


const root_pf = root_cell_object.getConvictById("root");

const distanceBetweenCenter = 3.4;
const incrementDistanceBetweenRings = 2;

const randomColors = ["#23CE6B", "#52528C", "#372554", "#81523F", "#E6C229","#861657","#A64253","#D56AA0","#06087B","#5D737E"];



function setup_children_position(root_convict_elm, rootCell = null, hierarchycount = 1, toomanyvars = true) {
  const  tempCell = rootCell ? rootCell :  Cell.getCell(root_convict_elm.parentNode);
  const tempCurrentConvict = tempCell.getConvictByDom(root_convict_elm);

  const tempArr = [...root_convict_elm.children];

  // tempArr.length % of slice, pi is 100% , 
  let mathtypeshit = tempArr.length > 3 ? ((Math.PI*2)/3) : ((Math.PI*2)/(tempArr.length));
  let currentRing = 0;
  let reservedColors = [];
  tempArr.forEach((element, i) => {
    if (element.nodeName === "CANVAS") return;
    const tempObject = tempCell.getConvictByDom(element);
    if(tempObject.name === '') tempObject.name = "asshole"+i;

    //console.log(tempObject);
    element.style.setProperty("--animation", `rot${Math.round(Math.random())} 42s linear infinite`);
  
    const templateForRealm = 
    `
      <div  idm="${tempObject.name}" autoCenter="true" simulate3D="true" scaleMultiplier="0.4">
        <h1 id="${tempObject.name}" class="${tempObject.parent.name} r-name r-name-hidden" ><span>${tempObject.name}</span></h1>
      </div>
    `;

    realmElm.insertAdjacentHTML('beforeend', templateForRealm);
  



   //We Need To Calculate A Percentage.




    if((i+1)%4 == 0 ){
      currentRing++;
      mathtypeshit = tempArr.length-i > 3 ? ((Math.PI*2)/3) : (Math.PI*2)/tempArr.length-i;
    }

    const ti     = (i+1)*(mathtypeshit);
    const zOffst = 0.35;

    ////console.log("i:", i, "ti:", ti);
    const currentOffsetX = Math.cos(tempCurrentConvict.parent.position.x+ti*(1+currentRing))*(hierarchycount*distanceBetweenCenter+(incrementDistanceBetweenRings*currentRing));
    const currentOffsetZ = Math.sin(tempCurrentConvict.parent.position.z+ti*(1+currentRing))*(hierarchycount*distanceBetweenCenter+(incrementDistanceBetweenRings*currentRing));

    //For position-z we need to count hierarchy !

    element.style.setProperty("--position", `(${currentOffsetX},${tempCurrentConvict.parent.position.y},${currentOffsetZ})`);
    element.style.setProperty("--scale", `(${tempCurrentConvict.parent.scale.x*zOffst},${tempCurrentConvict.parent.scale.y*zOffst},${tempCurrentConvict.parent.scale.z*zOffst})`);

    const currentPick = randomColors[Math.round(Math.random()*randomColors.length-1)]
    if(!reservedColors.includes(currentPick))
        reservedColors.push(currentPick);
    else
        reservedColors.push(randomColors[Math.round(Math.random()*randomColors.length-1)]);

    element.style.setProperty("--material-color", reservedColors[i]);

    //Todo : Update So That Every Next Parent Elment Has A lesser Base Ring Gravity Pull.
    setup_children_position(element, tempCell, hierarchycount*0.75, !toomanyvars);
  });
}

const CellCameraConvict = root_cell_object.getConvictById("cam");
const CellCameraParentConvict = root_cell_object.getConvictById("cam-parent");


let currentlyFocusedPlanet = root_pf;
let isTransitioning = false;

function focusOnPlanet(PlanetConvict){
  const pGlobalPos = new THREE.Vector3();
  
  PlanetConvict.getWorldPosition(pGlobalPos);
  
  CellCameraParentConvict.position.lerp(pGlobalPos, 0.1);
} 


const canGrab = async (url, fallbackUrl) => {
  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store"
    });

    window.quickshowOpen(url.toLowerCase(), {
        title: e.target.id + ".html",
        resetSize: false,
        size: { w: 65, h: 75 }
      });

    return res.ok;
  } catch (err) {
      console.log("grab failed:", url, err);
      window.open(fallbackUrl, "_blank"); 
    return false;
  }
};



const openOnClick = async (e) => {
  if (!cachedSorchererDiv) cachedSorchererDiv = document.getElementsByClassName("sorcherer-container")[0];

  const childrenArray = Array.from(cachedSorchererDiv.getElementsByClassName(e.target.id));
  console.log(e.target.id);

  const routePath = `${window.location.href}pages/${e.target.id.replaceAll(" ", "").toLowerCase()}/index.htm`;
  const fallbackUrl = `https://github.com/yepistream/${e.target.id.replaceAll(" ", "")}`;

  if (childrenArray.length == 0) {
    if (await canGrab(routePath.toLowerCase(), fallbackUrl)) {
      
      return;
    }

    return;
  }

  const clickedPlanet = root_cell_object.getConvictById(e.target.id);

  currentlyFocusedPlanet = clickedPlanet;
};


let currentRotationConvict = root_pf.userData.domEl;

function replaceCurrentRotationParent(convict) {
  if(currentRotationConvict){
    currentRotationConvict.style.setProperty("--animation", "none");
    currentRotationConvict = convict;
  }

  convict.style.setProperty("--animation", "rootrotating 35.5s linear infinite");

}

setup_children_position(root_pf.userData.domEl);
Sorcherer.bootstrap(root_cell_object.loadedScene, root_cell_object.focusedCamera, root_cell_object.threeRenderer,{
  interval : 0, 
  autoAttach : true,
  autoRegister : true
});


let cachedSorchererDiv = document.getElementsByClassName("sorcherer-container")[0];

setTimeout(()=>{
  Sorcherer.allLoadedElements.forEach(element => {
    element._parentSpan.addEventListener("click",openOnClick);
    const current_elm_id = element._parentSpan.children[0].id;

    /*if(cachedSorchererDiv.getElementsByClassName(current_elm_id).length == 0){
      element._parentSpan.children[0].innerText += ".html" 
    }*/
  })
},10)

document.documentElement.style.cursor = "grab";




let startGrabPose = {x:0,y:0};
let isGrab = false;

Sorcherer.container.addEventListener("mousedown", (e)=>{
  isGrab = true;
  Sorcherer.container.style.cursor = "grabbing"
  startGrabPose.x = e.clientX;
  startGrabPose.y = e.clientY;
})

Sorcherer.container.addEventListener("mouseup", (e)=>{
  isGrab = false
  Sorcherer.container.style.cursor = "grab";
});

const camSpeed = 0.0005;
let zoomInSpeed = 0.005;


function clamp (v,min,max) {return Math.min(Math.max(v, min), max)};


document.body.addEventListener("wheel",(e)=>{
  const dir = new THREE.Vector3();

  CellCameraConvict.translateZ(e.deltaY * zoomInSpeed);
  console.log(zoomInSpeed);
  zoomInSpeed = clamp(zoomInSpeed+Math.sign(e.deltaY)*0.0002, 0, 0.5);
  //CellCameraConvict.userData.domEl.style.setProperty("--position",`(${CellCameraConvict.position.x + Math.sign(-e.deltaY)*(dir.x*zoomInSpeed)},${CellCameraConvict.position.y + Math.sign(-e.deltaY)*(dir.y*zoomInSpeed)},${CellCameraConvict.position.z + Math.sign(-e.deltaY)*(dir.z*zoomInSpeed)})`);

});



const CellCameraParentConvict_qYaw = new THREE.Quaternion();
const CellCameraParentConvict_qPitch = new THREE.Quaternion();

const CellCameraParentConvict_worldUp = new THREE.Vector3(0, 1, 0);
const CellCameraParentConvict_localRight = new THREE.Vector3(1, 0, 0);

function updateCellCameraParentConvictQuaternion() {
  const q = CellCameraParentConvict.quaternion;

  CellCameraParentConvict.userData.domEl.style.setProperty(
    "--quaternion",
    `(${q.x},${q.y},${q.z},${q.w})`
  );
}

CellCameraConvict.lookAt(CellCameraParentConvict.position);
updateCellCameraParentConvictQuaternion();








Sorcherer.container.addEventListener("mousemove", (e)=>{
  if (!isGrab) return;

  const deltaX = e.clientX - startGrabPose.x;
  const deltaY = e.clientY - startGrabPose.y;

  CellCameraParentConvict_qYaw.setFromAxisAngle(
    CellCameraParentConvict_worldUp,
    -deltaX * camSpeed
  );

  CellCameraParentConvict_localRight
    .set(1, 0, 0)
    .applyQuaternion(CellCameraParentConvict.quaternion)
    .normalize();

  CellCameraParentConvict_qPitch.setFromAxisAngle(
    CellCameraParentConvict_localRight,
    deltaY * camSpeed
  );

  CellCameraParentConvict.quaternion
    .premultiply(CellCameraParentConvict_qYaw)
    .premultiply(CellCameraParentConvict_qPitch)
    .normalize();

  updateCellCameraParentConvictQuaternion();

  startGrabPose.x = e.clientX;
  startGrabPose.y = e.clientY;
});





//Update Function : 
root_cell_object.addUpdateFunction(()=>{
  focusOnPlanet(currentlyFocusedPlanet);
})

  

window.quickshowOpen('./pages/AboutMe/index.htm', {
  title: 'AboutMe.htm',
  resetSize: false,
  size: { w: 65, h: 75 }
});



/*
  TODO:
    1.Replace Drag Controls With A More Linear On-Click Planet To Foucs In Frame.
      1.A : Remove Drag Controls and replace it with a drag-orbit ones.
      2.B : Add in a Foucs mode, when clicked on a planet zoom into it, just enough to see both the planet and it's orbiters. (The Smaller The Planet, The Lesser The ZoomInAmount).
*/
