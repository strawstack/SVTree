class TreeMaker {
    constructor(d3) {
        this.d3 = d3;
    }
    update(content) {
        let config;
        try {
            config = JSON.parse(content);
        } catch {
            // block function on JSON parse error
            console.log("JSON parse error");
            return;
        }

        this.branchRand = H.makeRand(config.branch.seed);
        this.leafRand   = H.makeRand(config.leaf.seed);

        // type: {"branches": [], "children": []}
        let tree = this.makeTree(config);

        let branches = this.getBranches(tree); // type: [Branch]
        let leaves = this.makeLeaves(config, tree); // type: [Leaf]

        d3.select("svg")
            .style("background", config.background)

        let d3_branch_base = d3.select("svg")
            .selectAll(".branch-base")
            .data(branches);
        let d3_branch_top = d3.select("svg")
            .selectAll(".branch-top")
            .data(branches);
        let d3_branch_path = d3.select("svg")
            .selectAll(".branch-path")
            .data(branches);

        // Base circle
        d3_branch_base
            .enter()
            .append("circle")
        .merge(d3_branch_base)
            .attr("class", "branch-base")
            .attr("cx", d => d.p1.x)
            .attr("cy", d => d.p1.y)
            .attr("r", d => d.r1)
            .attr("fill", config.branch.color);
        d3_branch_base.exit().remove();

        // Second circle
        d3_branch_top
            .enter()
            .append("circle")
            .attr("class", "branch-top")
        .merge(d3_branch_top)
            .attr("cx", d => d.p2.x)
            .attr("cy", d => d.p2.y)
            .attr("r", d => d.r2)
            .attr("fill", config.branch.color);
        d3_branch_top.exit().remove();

        // Connecting shape
        d3_branch_path
            .enter()
            .append("path")
            .attr("class", "branch-path")
        .merge(d3_branch_path)
            .attr("d", d => d.path)
            .attr("stroke", config.branch.color)
            .attr("fill", config.branch.color);
        d3_branch_path.exit().remove();

        let d3_leaves = d3.select("svg")
            .selectAll(".leaf")
            .data(leaves);
        d3_leaves
            .enter()
            .append("circle")
        .merge(d3_leaves)
            .attr("class", "leaf")
            .attr("cx", d => d.point.x)
            .attr("cy", d => d.point.y)
            .attr("r", d => d.radius)
            .attr("opacity", config.leaf.opacity)
            .attr("fill", d => d.color);
        d3_leaves.exit().remove();


    }
    makeTree(config, level, parentBranch) {
        // Return Tree{branch: [], children: []}
        if (level === undefined) level = 0;

        // Don't exceed number of branch levels
        if (level > config.branch.maxLevel) return undefined;

        // Make branch
        let branch = this.makeBranch(config, level, parentBranch);

        // Create child trees
        let children = [];
        for (let i=0; i < config.branch.splits; i++) {
            let tree = this.makeTree(config, level + 1, branch);
            if (tree !== undefined) {
                children.push(tree);
            }
        }

        return {
            "branch": branch,
            "children": children
        };
    }
    makeBranch(config, level, parentBranch) {

        // level: 0 make branches off root
        // level < 0: branch off random parent segment
        // Return branch as type: [Segment]
        let parentSegment = this.randomSegment(parentBranch);
        let pointData = this.randomPointDataFromSegment(parentSegment);

        let rootPoint;
        let rootRadius;
        let rootAngle;
        let rootLength;

        if (level === 0) {
            rootPoint  = config.branch.root;
            rootRadius = config.branch.rootRadius;
            rootAngle  = config.branch.rootAngle;
            rootLength = config.branch.rootLength;
        } else {
            rootPoint  = pointData.point;
            rootRadius = pointData.radius;
            rootAngle  = this.branchRand() * 140 + 20;
            rootLength = parentSegment.length * (1 - config.branch.lengthShrink);
        }

        let branch = [];

        let joints = Math.floor(
            config.branch.joints * Math.pow(1 - config.branch.jointShrink, level)
        );

        // First Segment in Branch
        if (joints > 0) {
            let firstSegment = {
                r1: rootRadius,
                p1: rootPoint,
                r2: rootRadius * (1 - config.branch.widthShrink),
                p2: this.getP2(rootPoint, rootAngle, rootLength),
                angle: rootAngle,
                length: rootLength
            };
            firstSegment.path = this.buildPathFromSegment(firstSegment);
            branch.push(firstSegment);
        }

        let length = config.branch.rootLength * Math.pow(1 - config.branch.lengthShrink, level + 1)

        // Remaining segments for Branch
        for (let i=0; i < joints - 1; i++) {
            let prevSeg = branch[branch.length - 1];
            let nr = prevSeg.r2 * (1 - config.branch.widthShrink);
            if (nr < config.branch.minRadius) { nr = config.branch.minRadius; }
            let p1 = prevSeg.p2;
            let angle = this.branchRand() * 120 - 60 + prevSeg.angle;
            let segment = {
                r1: prevSeg.r2,
                p1: p1,
                r2: nr,
                p2: this.getP2(p1, angle, length),
                // angle = prev.angle +/- 60deg
                angle: angle,
                length: length
            };
            segment.path = this.buildPathFromSegment(segment);
            branch.push(segment);
        }
        return branch;
    }
    getP2(point, angle, length) {
        // Returns P2 given P1, angle and length
        let p2x = length * Math.cos(H.rad(angle)) + point.x;
        let p2y = length * Math.sin(-1 * H.rad(angle)) + point.y;
        return { x: p2x, y: p2y };
    }
    buildPathFromSegment(segment) {
        // Returns connecting SVG path (`d` attr) from given branch Segment
        let dx = segment.p2.x - segment.p1.x;
        let dy = segment.p2.y - segment.p1.y;
        let angle = Math.atan2(dy, dx);
        let a1 = H.deg(angle) + 90;
        let a2 = H.deg(angle) - 90;

        let x3 = segment.r1 * Math.cos(H.rad(a1));
        let y3 = segment.r1 * Math.sin(H.rad(a1));
        let x4 = segment.r1 * Math.cos(H.rad(a2));
        let y4 = segment.r1 * Math.sin(H.rad(a2));
        let x5 = segment.r2 * Math.cos(H.rad(a1));
        let y5 = segment.r2 * Math.sin(H.rad(a1));
        let x6 = segment.r2 * Math.cos(H.rad(a2));
        let y6 = segment.r2 * Math.sin(H.rad(a2));

        let cx1 = segment.p1.x + x3;
        let cy1 = segment.p1.y + y3;
        let cx2 = segment.p1.x + x4;
        let cy2 = segment.p1.y + y4;
        let cx3 = segment.p2.x + x5;
        let cy3 = segment.p2.y + y5;
        let cx4 = segment.p2.x + x6;
        let cy4 = segment.p2.y + y6;

        let _path = `M ${cx1},${cy1}L ${cx3},${cy3}L ${cx4},${cy4}L ${cx2},${cy2}Z`;
        return _path;
    }
    randomSegment(parentBranch) {
        // Return branch from list of branches
        if (parentBranch === undefined) return undefined;
        let index = Math.floor(this.branchRand() * parentBranch.length);
        return parentBranch[index];
    }
    randomPointDataFromSegment(segment) {
        // Return {point:, radius:} from given branch
        // TODO - in future, point could be from anywhere on the branch
        // rather than fixed as `Segment.p1`
        if (segment === undefined) return undefined;
        return {
            "point": segment.p1,
            "radius": segment.r1
        };
    }
    getBranches(tree) {
        let branches = [];
        let getBranchesRec = (t) => {
            branches.push(...t.branch);
            for (let child of t.children) {
                getBranchesRec(child);
            }
        };
        getBranchesRec(tree);
        return branches;
    }
    makeLeaves(config, tree) {
        let branches = this.getBranches(tree);
        branches.splice(0, config.leaf.branchMask);
        let leaves = [];

        for (let i = 0; i < config.leaf.number; i++) {
            let index = Math.floor(this.leafRand() * branches.length);
            let b = branches[index];

            // Leaf offset
            let adj = b.angle + 90; // Perpendicular to branch angle
            let offset = this.leafRand() * 2 * config.leaf.spread - config.leaf.spread;

            let ox = offset * Math.cos(H.rad(adj));
            let oy = offset * Math.sin(-1 * H.rad(adj));

            let base = b.p1;
            let length = b.length * this.leafRand();
            let point = {
                x: base.x + length * Math.cos(H.rad(b.angle)) + ox,
                y: base.y + length * Math.sin(-1 * H.rad(b.angle)) + oy
            };

            let color_index = Math.floor(config.leaf.color.length * this.leafRand());
            let color = config.leaf.color[color_index];

            leaves.push({
                point: point,
                radius: config.leaf.radius,
                color: color
            });
        }
        return leaves;
    }
}
