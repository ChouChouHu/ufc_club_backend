require('dotenv').config();
const util = require('../helper/util');
const Monitor = require('../models/monitor_model');
const Validator = require("../helper/assignment_validator");
const rp = require("request-promise");
const {BATCH, GITHUB_TOKEN} = process.env;
const VALIDATE_TYPES = {
    PULL_REQUEST: 'pull_request',
    COMMENT: 'comment',
    MERGE: 'merge',
    CLOSED: 'closed',
}

const getProgresses = async (req, res) => {
    const {batch} = req.params;
    if (!batch) {batch = BATCH};

    const students = await Monitor.getStudents(batch);
    const assignments = await Monitor.getAssignments(batch);
    const progresses = await Monitor.getProgresses(students.map(s => s.id));
    const status = await Monitor.getStatus();
    const currentAssignmentId = util.getCurrentAssignmentId(assignments);

    res.status(200).json({students, assignments, progresses, status, currentAssignmentId});
}

const addProgresses = async (req, res) => {
    console.log("============= ADD OR UPDATE PROGRESSES =============");

    let payload;
    if (req.body) {
        payload	= req.body;
    } else {
        console.log('can not find payload');
        res.send('can not find payload');
        return;
    }

    console.log("payload:", payload);

    let uri;
    let validateType;
    if (payload.action == 'closed' && !payload.pull_request.merged_at) {
        validateType = VALIDATE_TYPES.CLOSED;
    } else if (payload.pull_request) {
        if (payload.pull_request.merged_at) {
            validateType = VALIDATE_TYPES.MERGE;
        } else if (payload.action == 'opened') {
            validateType = VALIDATE_TYPES.PULL_REQUEST;
        }
        uri = payload.pull_request.issue_url + '/comments';
    } else if (payload.comment && payload.comment.body.toLowerCase().trim() == 'fixed') {
        uri = payload.comment.issue_url + '/comments';
        validateType = VALIDATE_TYPES.COMMENT;
    }

    if (!validateType) {
        console.log("payload without valid type");
        res.send("payload without valid type" );
        return;
    }

    console.log("validateType:", validateType)
    
    // 1. parse payload
    let data;
    try {
        data = await parseGithubPayload(payload, validateType);
        console.log('payload data:', data);
    } catch (e) {
        await postComment(uri, e.message);
        console.log('parse payload failed:', e.message);
        console.log('payload:', payload);
        res.send(e.message);
        return;
    }

    // 2. validate
    let validResult;
    try {
        if (validateType == VALIDATE_TYPES.PULL_REQUEST || validateType == VALIDATE_TYPES.COMMENT) {
            validResult = await Validator.validate(data.assignment.part, data.student.server);
            console.log("validResult:", validResult);
        }
    } catch (e) {
        console.log('validate failed,:', e.message);
        res.send('validate failed');
    }

    // 3. save change to DB
    console.log(validateType);
    if (validateType == VALIDATE_TYPES.PULL_REQUEST) {
        const progress = {
            student_id: data.student.id,
            assignment_id: data.assignment.id,
            pr_link: data.prLink,
            status_id: validResult.status,
        }
        Monitor.createProgress(progress);
    } else if (validateType == VALIDATE_TYPES.COMMENT) {
        await Monitor.updateProgress(data.progress.id, {status_id: validResult.status});
    } else if (validateType == VALIDATE_TYPES.MERGE) {
        await Monitor.updateProgress(data.progress.id, {status_id: 3, finished_at: new Date(data.mergedAt)});
    } else if (validateType == VALIDATE_TYPES.CLOSED) {
        await Monitor.updateProgress(data.progress.id, {status_id: 4});
    }

    // 4. post result
    if (validateType == VALIDATE_TYPES.PULL_REQUEST || validateType == VALIDATE_TYPES.COMMENT) {
        await postComment(uri, validResult.message);
    }

    res.json({data: "OK"})
}

async function parseGithubPayload(payload, validateType) {
    let detail;
    if (validateType == VALIDATE_TYPES.PULL_REQUEST || validateType == VALIDATE_TYPES.MERGE || validateType == VALIDATE_TYPES.CLOSED) {
        detail = payload.pull_request;
        const baseBranch = detail.base.ref.toLowerCase();
        const compareBranch = detail.head.ref.toLowerCase();
        detail.prLink = payload.pull_request.html_url;

        const student = await Monitor.getStudentByGitHubName(BATCH, detail.user.login);
        const studentBranch = student.name.toLowerCase() + '_develop';
        // 1. check base branch (should be <student_name>_develop)
        if (baseBranch != studentBranch) {
            console.log(`base branch should be: ${studentBranch}}`);
            throw Error(`{error: base branch should be **${studentBranch}**, note: please **Close** this pull request and create a new one}`);
        }

        // 2. check compare branch (should be week_x_part_y and can be found in DB in this batch)
        const assignment = await Monitor.getAssignmentByName(BATCH, compareBranch);
        if (!assignment) {
            throw Error(`{error: compare branch name should be **week_n_part_m**, note: please **Close** this pull request and create a new one}`)
        }

        // 3. get progress when the type is merge
        if (validateType == VALIDATE_TYPES.MERGE || validateType == VALIDATE_TYPES.CLOSED) {
            const progress = await Monitor.getProgressByPRLink(detail.prLink);
            detail.progress = progress;
        }

        detail.student = student;
        detail.assignment = assignment;
    } else if (validateType == VALIDATE_TYPES.COMMENT) {
        detail = payload.comment;
        detail.prLink = payload.issue.html_url;
        
        // 1. find progress
        const progress = await Monitor.getProgressByPRLink(detail.prLink);
        if (!progress) {
            throw Error(`{error: comment on a wrong pull request, note: please contact Arthur for this problem}`);
        }
        
        const student = await Monitor.getStudentById(progress.student_id);
        const assignment = await Monitor.getAssignmentById(progress.assignment_id);

        detail.student = student;
        detail.assignment = assignment;
        detail.progress = progress;
    }

    return {
        prLink: detail.prLink,
        mergedAt: detail.merged_at,
        student: detail.student,
        assignment: detail.assignment,
        progress: detail.progress,
    }
}

async function postComment(uri, content) {
    console.log("post comment to uri:", uri);
    const headers = {
        'User-Agent': 'request',
        Authorization: `token ${GITHUB_TOKEN}`
    }
    const body = JSON.stringify({"body": JSON.stringify(content)});
    await rp({method: 'POST', uri, body: body, headers});
}

module.exports = {
    getProgresses,
    addProgresses,
}
