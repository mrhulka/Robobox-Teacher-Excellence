"use strict";
// Feedback form spec (from Robobox Teacher Visit & Feedback Form) + RAG config.
// Classic script: CONFIG is a global shared with the other scripts.
const CONFIG = {
    geofenceMeters: 200,
    expectedStart: '08:00', // school reporting time; lateness is measured from here. Per-school if timings vary.
    grades: ['Grade 1-2', 'Grade 3-4', 'Grade 5-6', 'Grade 7-8', 'Grade 9-10', 'Mixed batch'],
    modules: ['Intro to Robotics', 'Electronics & Circuits', 'Coding Basics', 'Sensors & Automation', 'AI & ML Basics', 'Project Build'],
    ratingScale: [
        { v: 1, label: 'Significantly below expectation' },
        { v: 2, label: 'Partially meets expectation' },
        { v: 3, label: 'Meets expected standard' },
        { v: 4, label: 'Strong' },
        { v: 5, label: 'Excellent' },
    ],
    pillars: [
        { id: 'A', name: 'Academic & Syllabus', q: [
                ['A1', 'Teacher is prepared and understands the lesson topic.'],
                ['A2', 'The class follows the prescribed syllabus/module.'],
                ['A3', 'The key learning objective is covered.'],
                ['A4', 'Concepts are explained correctly and clearly.'],
                ['A5', 'Teacher checks whether students understand (questions, recap, short assessment).'],
                ['A6', 'Students can explain the key idea they learnt.'],
                ['A7', 'Lesson is completed as planned, or any change is handled appropriately.'],
            ] },
        { id: 'B', name: 'Practical Learning', q: [
                ['P1', 'Required kits and materials are ready before the activity.'],
                ['P2', 'Teacher demonstrates the activity/process when needed.'],
                ['P3', 'Students get meaningful hands-on time.'],
                ['P4', 'Students participate actively in the practical activity.'],
                ['P5', 'Students can explain or demonstrate what they built/did.'],
                ['P6', 'Teacher helps students troubleshoot without taking over the task.'],
                ['P7', 'Safety instructions are followed during the activity.'],
            ] },
        { id: 'C', name: 'Overall Experience', q: [
                ['O1', 'Teacher manages the classroom respectfully and effectively.'],
                ['O2', 'Teacher encourages questions and curiosity.'],
                ['O3', 'Teacher is punctual and professionally presented.'],
                ['O4', 'Teacher communicates professionally with school staff.'],
                ['O5', 'Teacher responds constructively to feedback and support.'],
                ['O6', 'Overall, how well did the class meet the Robobox standard?'],
            ] },
    ],
    critical: [
        ['N1', 'Correct module being taught', ['Yes', 'No', 'N/A']],
        ['N2', 'Learning objective covered', ['Yes', 'No', 'N/A']],
        ['N3', 'Hands-on activity conducted where required', ['Yes', 'No', 'N/A']],
        ['N4', 'Students actively participated', ['Yes', 'No', 'N/A']],
        ['N5', 'Correct technical process followed', ['Yes', 'No', 'N/A']],
        ['N6', 'Class ended with recap / assessment', ['Yes', 'No', 'N/A']],
        ['N7', 'No major deviation from prescribed curriculum', ['Yes', 'No']],
        ['N8', 'No major classroom management issue', ['Yes', 'No']],
        ['N9', 'Safety concern observed?', ['Yes', 'No']],
    ], // rows are [id, label, options] tuples
    judgement: {
        independence: ['Yes — independently', 'Yes — with some support', 'No — intervention needed'],
        improvement: ['No immediate action', 'Academic/syllabus support', 'Practical/technical training', 'Classroom management', 'Student engagement', 'School communication', 'Safety follow-up', 'Other'],
        action: ['No action — continue normal monitoring', 'Share positive practice', 'Coaching by coordinator', 'Technical refresher', 'Academic/syllabus support', 'Follow-up classroom observation', 'Immediate escalation', 'Other'],
    },
    rag: { green: 'Green — on track', amber: 'Amber — coaching/support needed', red: 'Red — urgent or repeated/significant concern' },
    leaveTypes: ['Casual', 'Sick', 'Earned', 'Unpaid'],
    requestCategories: ['Robotics kit', 'Electronics components', 'Tools', 'Stationery/Printables', 'Replacement part', 'Other'],
};
