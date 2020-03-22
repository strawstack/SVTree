class Scrubber {
    // This class connects with the scrubber DOM element
    // and contains helper methods for displaying the
    // scrubber and relaying update information obtained
    // through the scrubber to the currently targeted
    // ace token
    constructor(editor, scrubElement, size) {
        this.editor = editor;
        this.scrubElement = scrubElement;
        this.scrubElementPointer = scrubElement.querySelector(".scrubber-pointer");
        this.size = size; // editor lineHeight and column sizes
        this.scrubberList = [];
        this.token = undefined; // current target token in editor
        this.mousedown = false; // true if mousedown, false otherwise
        this.offset = {x: 0}; // offset of mousedown in scrubber element
        this.height = 16; // height of scrubber
        this.width = 40; // width of scrubber
        this.bindLocation = { "left": 0 }; // Scrubber left on bind
        this.mouseDownLocation = {"x": 0};
        this.bindValue = 0;
        this.currentValue = 0; // Current value being modified
        this.bindRow = 0;
        this.data = {}; // Data for type of scrubber
        this.scrubRate = 5; // divide delta by this value
        this.isBusy = false;

        // Drag listeners
        this.scrubElement.addEventListener("mousedown", e => {
            this.mousedown = true;
            this.mouseDownLocation.x = e.clientX;
            this.offset.x = e.offsetX;
        });
        window.addEventListener("mouseup", e => {
            if (this.mousedown) {
                this.mousedown = false;
                this.scrubElement.style.left = this.bindLocation.left + "px";
                this.findScrubbers();
                this.unbind();
                let p = editor.getCursorPosition();
                let token = this.editor.session.getTokenAt(p.row, p.column);
                this.bindToken(p, token, this.scrubberDataAtPosition(p));
            }
        });
        window.addEventListener("mousemove", e => {
            if (this.token !== undefined && this.mousedown) {
                this.scrubElement.style.left = (e.clientX - this.offset.x) + "px";

                let currentLength = this.currentValue.toString().length;
                let end = this.token.start + currentLength;

                // Calculate delta x and apply update to editor token
                let dx = e.clientX - this.mouseDownLocation.x;

                let newValue;
                if (this.data.type == "INT" || this.data.type == "RANDOM") {
                    newValue = this.bindValue + Math.floor(dx/this.scrubRate);

                } else { // Assume 'FLOAT'
                    let value = 0.01 * Math.floor(dx/this.scrubRate);
                    value = Math.round(value * 100) / 100;
                    newValue = this.bindValue + value;

                }
                let strNewValue = newValue.toString();

                let p = editor.getCursorPosition();
                let range = new ace.Range(p.row, this.token.start, p.row, end);
                this.isBusy = true;
                this.editor.session.remove(range);
                this.isBusy = false
                this.editor.session.insert({
                    row: p.row, column: this.token.start
                }, strNewValue);
                this.currentValue = newValue;
            }
        });
    }
    findScrubbers() {
        // Find scrubber locations in current editor content
        // update this.scrubberList

        // Block function if scrubbing is in progress
        if (this.mousedown) return;

        let content = this.editor.getValue();
        let lines = content.split("\n");
        this.scrubberList.splice(0, this.scrubberList.length); // Clear array

        // Regex

        // Match each regex with each line to locate scrubber values
        let row = 0;
        for (let line of lines) {

            // seed
            let seed_regexp = /seed/g;
            let seed_res = [...line.matchAll(seed_regexp)];
            let hasSeed = seed_res.length > 0;

            // int
            let int_regexp = /\d+/g;
            let int_res = [...line.matchAll(int_regexp)];
            let hasInt = int_res.length > 0;

            // float
            let float_regexp = /\d+\.\d+/g;
            let float_res = [...line.matchAll(float_regexp)];
            let hasFloat = float_res.length > 0;

            // hex
            let hex_regexp = /#[0123456789abcdefg]{3,6}/ig;
            let hex_res = [...line.matchAll(hex_regexp)];
            let hasHex = hex_res.length > 0;

            // rgba
            let rgba_regexp = /rgba\(.*\)/g;
            let rgba_res = [...line.matchAll(rgba_regexp)];
            let hasRgba = rgba_res.length > 0;

            if (hasFloat) {
                for (let f of float_res) {
                    this.scrubberList.push({
                        "start": f.index,
                        "length": f[0].length,
                        "type": "FLOAT",
                        "row": row
                    });
                }

            } else if (hasSeed && hasInt) {
                this.scrubberList.push({
                    "start": int_res[0].index,
                    "length": int_res[0][0].length,
                    "type": "RANDOM",
                    "row": row
                });

            } else if (hasInt && !hasFloat && !hasHex && !hasRgba) {
                for (let _int of int_res) {
                    this.scrubberList.push({
                        "start": _int.index,
                        "length": _int[0].length,
                        "type": "INT",
                        "row": row
                    });
                }

            } else if (hasHex) {
                this.scrubberList.push({
                    "start": hex_res[0].index,
                    "length": hex_res[0][0].length,
                    "type": "HEX",
                    "row": row
                });

            }
            if (hasRgba) {
                this.scrubberList.push({
                    "start": rgba_res[0].index,
                    "length": rgba_res[0][0].length,
                    "type": "RGBA",
                    "row": row
                });

            }
            row += 1;
        }
    }
    scrubberDataAtPosition(position) {
        let lst = this.scrubberList.filter(v => {
            let rowCheck = (v.row == position.row);
            let colCheck = (position.column > v.start) && (position.column <= v.start + v.length);
            return rowCheck && colCheck;
        });
        if (lst.length > 0) {
            return lst[0];
        } else {
            return undefined;
        }
    }
    bindToken(position, token, scrubberDataAtPosition) {
        this.token = token;
        this.data = scrubberDataAtPosition;
        let p = position;
        let tokenStart = token.start;
        let tokenLength = token.value.length;
        let tokenCenter = tokenStart + tokenLength/2;

        // Distance to token center
        let top  = p.row * this.size.lineHeight - 1.5 * this.size.lineHeight;
        let _left = this.size.columnWidth * tokenCenter + 1.5 * this.size.columnWidth - this.width/2;
        let left = this.size.gutterWidth + _left;
        this.bindLocation.left = left;
        this.bindValue = parseFloat(token.value);
        this.currentValue = this.bindValue;
        this.bindRow = p.row;

        this.scrubElement.style.top     = top + "px";
        this.scrubElement.style.left    = left + "px";
        this.scrubElement.style.width   = this.width + "px";
        this.scrubElement.style.height  = this.height + "px";
        this.scrubElement.style.opacity = 0.8;
        this.scrubElementPointer.style.opacity = 0.8;
    }
    unbind() {
        this.token = undefined;
        this.scrubElement.style.top    = "0px";
        this.scrubElement.style.left   = "0px";
        this.scrubElement.style.width  = "0px";
        this.scrubElement.style.height = "0px";
        this.scrubElement.style.opacity = 0;
        this.scrubElementPointer.style.opacity = 0;
    }
}
