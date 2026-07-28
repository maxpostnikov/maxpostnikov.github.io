/** Creates one bomb for a connected match containing a run of four or more. */
export default class BombCreationRule {
    constructor({ priority = 100 } = {}) {
        this.priority = priority;
    }

    evaluate(matchCluster) {
        const qualifyingRun = matchCluster.runs.find(run => run.length >= 4);
        if (!qualifyingRun) return null;

        return {
            position: { ...qualifyingRun.positions[0] }
        };
    }
}
