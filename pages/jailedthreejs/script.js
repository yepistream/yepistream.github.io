import { JThree,Cell } from 'jailedthreejs';

const cell = Cell.getCell(document.getElementById('first-contact'));
const wizz  = cell.getConvictById('wizzzard');

const jailbreak = document.getElementById("jailbreak");






jailbreak.innerText = 
`<cell id="first-contact">
    <perspectivecamera  render></perspectivecamera >
    <ambientlight class="amb-light"></ambientlight>
    <mesh id="wizzzard"></mesh>
</cell> `