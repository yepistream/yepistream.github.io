//ITS 3 AM and im writing this code instead of sleeping
var windows = [document.getElementById("homeThing").style,document.getElementById("aboutThing").style,document.getElementById("projectsThing").style ];

function openSesame(index) {
    if(index > windows.length){
        print("This window isn't indexed");
    }
    else{ 
        windows[index].zIndex = "4";
    }
}
function closeTheDoorImPlayingMinecraft(index) { //YEA FUQ ME WITH THESE LONG NAMES
    if(index > windows.length){
        print("This window isn't indexed");
    }
    else{ 
        windows[index].zIndex = "-2";
    }
}

function errorAlert(){
    alert("Yea.... No...");
}

//I think i might have dislocated my goddammed big finger on my left foot..... FUCK.

// El fin....