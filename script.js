import * as THREE from "three";
import { Cell, JThree } from "jailedthreejs";
import { Sorcherer } from "sorcherer";

const realmElm = document.querySelector("realm");

const root_cell_elm = document.getElementById("root-cell");
const root_cell_object = Cell.getCell(root_cell_elm);


const root_pf = root_cell_object.getConvictById("root");

const distanceBetweenCenter = 3;


function setup_children_position(root_convict_elm, rootCell = null) {
  const  tempCell = rootCell ? rootCell :  Cell.getCell(root_convict_elm.parentNode);
  const tempCurrentConvict = tempCell.getConvictByDom(root_convict_elm);

  const tempArr = [...root_convict_elm.children];

  // tempArr.length % of slice, pi is 100% , 
  const mathtypeshit = ((Math.PI*2)/tempArr.length);

  tempArr.forEach((element, i) => {
    if (element.nodeName === "CANVAS") return;
    const tempObject = tempCell.getConvictByDom(element);
    if(tempObject.name === '') tempObject.name = "asshole"+i;

    console.log(tempObject);

  
    const templateForRealm = 
    `
      <div  idm="${tempObject.name}" autoCenter="false" simulate3D="true" offset="0,0,0">
        <h1 id="${tempObject.name}" class="${tempObject.parent.name} r-name r-name-hidden" >${tempObject.name}</h1>
      </div>
    `;

    realmElm.insertAdjacentHTML('beforeend', templateForRealm);
  



   //We Need To Calculate A Percentage.


    const ti =  (i+1)*mathtypeshit;
    const zOffst = 0.01;


    console.log("i:", i, "ti:", ti);
    const currentOffsetX = Math.cos(tempCurrentConvict.position.x+ti)*distanceBetweenCenter;
    const currentOffsetY = Math.sin(tempCurrentConvict.position.y+ti)*distanceBetweenCenter;

    //For position-z we need to count hierarchy !

    element.style.setProperty("--position", `(${currentOffsetX},${currentOffsetY},${tempCurrentConvict.parent.position.z-zOffst})`);


    setup_children_position(element, tempCell);


  });


}



const CellCameraConvict = root_cell_object.getConvictById("cam");










function openOnClick(e) {
  if(cachedSorchererDiv) cachedSorchererDiv = document.getElementsByClassName("sorcherer-container")[0];


  //  Click On Element -> Grab The Convict Using ID Thru The Cell.getCell(id...) 
  //           -> Grab All Elements under div.sorcherer-container tag that classList.contains(tempParentConvict.name)
  //                      -> Run Thru Each Child.
  const childrenArray = Array.from(cachedSorchererDiv.getElementsByClassName(e.target.id));

  if(childrenArray.length == 0 ){
    window.quickshowOpen(`./pages/${e.target.id}/index.htm`, {title : e.target.id+".html",resetSize : false, size : {w : 65 , h: 75}});
    console.log("ass");
    return;
  }

  const hideChildrenToo = (cRecusvie)=>{
    const newArry = Array.from(cachedSorchererDiv.getElementsByClassName(cRecusvie.id));
    newArry.forEach(element => {
        element.classList.add("r-name-hidden");
        hideChildrenToo(element);
    });
  }

  childrenArray.forEach(cElm => {
    if(cElm.classList.contains("r-name-hidden")){
      cElm.classList.remove("r-name-hidden");
    }
    else{
      cElm.classList.add("r-name-hidden");
      hideChildrenToo(cElm);
    }
  });

  //TODO : Zoom In Camera On Parent Element
  const parentConvictElm = document.getElementById(e.target.id);
  replaceCurrentRotationParent(parentConvictElm)
  /*CellCameraConvict.userData.domEl.style.setProperty("--position-x", parentConvict.position.x);
  CellCameraConvict.userData.domEl.style.setProperty("--position-y", parentConvict.position.y);
  CellCameraConvict.userData.domEl.style.setProperty("--position-z", parentConvict.position.z/2);*/

}





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
  console.log(cachedSorchererDiv.getElementsByClassName(current_elm_id));
  console.log(current_elm_id);
  if(cachedSorchererDiv.getElementsByClassName(current_elm_id).length == 0){
    element._parentSpan.children[0].innerText += ".html" 
    console.log(element._parentSpan.children[0].innerText );
  }
})
},1000)

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

const camSpeed = 0.005;


function clamp (v,min,max) {return Math.min(Math.max(v, min), max)};


document.body.addEventListener("wheel",(e)=>{
  CellCameraConvict.userData.domEl.style.setProperty("--position-z", clamp(CellCameraConvict.position.z+e.deltaY/100,-100,-1)); 
});


Sorcherer.container.addEventListener("mousemove", (e)=>{
  if (!isGrab) return;

  CellCameraConvict.userData.domEl.style.setProperty("--position-x", CellCameraConvict.position.x - (e.clientX - startGrabPose.x)*(camSpeed/*/CellCameraConvict.position.z*/))
  CellCameraConvict.userData.domEl.style.setProperty("--position-y", CellCameraConvict.position.y + (e.clientY - startGrabPose.y)*(camSpeed/*/CellCameraConvict.position.z*/))

  startGrabPose.x = e.clientX; startGrabPose.y = e.clientY;
});

