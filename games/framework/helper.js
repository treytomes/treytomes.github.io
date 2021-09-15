/**
 * Functions to be imported directly into the HTML.
 */

 function openFullscreen(elem) {
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { /* Safari */
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE11 */
        elem.msRequestFullscreen();
    }

    // This chunk is superceded by the renderTexture scaling function.
    /*
    if (canvas.clientWidth > canvas.clientHeight) {
        canvas.width = canvas.height * (canvas.clientWidth / canvas.clientHeight);
    } else {
        canvas.height = canvas.width * (canvas.clientHeight / canvas.clientWidth);
    }
    */
}
