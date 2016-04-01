var nodemailer = require('nodemailer');
var schedule = require('node-schedule');
var config = require('config');
var db = require('qsfamily-database');
var mailConfig = config.get('mail');
var debug = require('debug')('QSFamily:postman');
var moment = require('moment');

var transporter = nodemailer.createTransport({
    pool: true,
    host: mailConfig.host,
    port: 465,
    secure: true,
    auth: {
        user: mailConfig.user,
        pass: mailConfig.pass
    },
    maxConnection: 5,
    maxMessages: 10,
    rateLimit: 5
});

function remind() {
    var today = new Date();
    console.log(today.toString() + "\tReminding students...");
    db.Student.find()
        .populate("assignments.reference")
        .then(function(students) {
            for (var student of students) {
                if (student.reminder.dueDate || student.reminder.deadline) {
                    // need to remind due date
                    for (var assignment of student.assignments) {
                        if (!assignment.complete && assignment.reference) {
                            //if assignment doesn't complete
                            debug("Uncomplete assignment detected");
                            var dueDate = moment(assignment.reference.dueDate);
                            var deadline = moment(assignment.reference.deadline);
                            debug("Due date:", dueDate.toNow(true));

                            if (student.reminder.dueDate && "in a day" === dueDate.fromNow()) {
                                // if tomorrow is the due date
                                transporter.sendMail({
                                  from: mailConfig.from,
                                  to: student.studentId + "@zju.edu.cn",
                                  subject: "轻松家园作业提醒",
                                  text: student.name + "：\n" + assignment.reference.title + "明天就要截止了，请及时提交"
                                }, function(err, info) {
                                    if (err) console.log(err.stack);
                                    var now = new Date();
                                    console.log(now.toString() + ": sent due date reminder to " + student.name);
                                });
                            }

                            if (student.reminder.deadline && "in a day" === deadline.fromNow()) {
                                // if tomorrow is the deadline
                                console.log("Gonna send email");
                                transporter.sendMail({
                                  from: mailConfig.from,
                                  to: student.studentId + "@zju.edu.cn",
                                  subject: "轻松家园作业提醒",
                                  text: student.name + "：\n" + assignment.reference.title + "明天就要截止了，请及时提交"
                                }, function(err, info) {
                                    if (err) console.log(err.stack);
                                    var now = new Date();
                                    console.log(now.toString() + ": sent deadline reminder to " + student.name);
                                });
                            }
                        }
                    }
                }
            }
        });
}

var remindStudents = schedule.scheduleJob('0 8 * * *', () => {
    remind();
});

