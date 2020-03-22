function main() {
    // let rand = H.makeRand(45);

    // Constants
    const size = {
        lineHeight: 16,
        columnWidth: 7.2,
        gutterWidth: 41
    };
    const scrubElement = document.querySelector(".scrubber-area");

    let editor = ace.edit("editor");
    editor.setTheme("ace/theme/tomorrow"); // tomorrow_night, clouds
    editor.session.setMode("ace/mode/javascript");

    let scrubber = new Scrubber(editor, scrubElement, size);
    let treeMaker = new TreeMaker(d3);

    let onUpdate = () => {
        scrubber.findScrubbers();
        treeMaker.update(editor.getValue());
    };

    // List of index locations for scrubber values
    onUpdate();
    editor.on("change", e => {
        if (!scrubber.isBusy) {
            console.log("called");
            onUpdate();
        }
    });

    editor.on("changeSelection", () => {
        // Block when scrubbing is in progress
        if (scrubber.mousedown) return;

        let p = editor.getCursorPosition();

        // List scrubbers at this cursor position
        let scrubberDataAtPosition = scrubber.scrubberDataAtPosition(p);

        // Bind scrubber to token
        if (scrubberDataAtPosition !== undefined) {
            let token = editor.session.getTokenAt(p.row, p.column);
            scrubber.bindToken(p, token, scrubberDataAtPosition);
        } else {
            // Hide scrubber
            scrubber.unbind();
        }
    });
}

window.onload = main;
