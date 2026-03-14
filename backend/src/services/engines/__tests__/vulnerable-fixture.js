/**
 * Vulnerable test fixture for SAST engine verification.
 * This file intentionally contains many security issues for testing purposes.
 * DO NOT use any of this code in production.
 */

// S001 — eval()
const userInput = "alert('xss')";
eval(userInput);

// S002 — SQL Injection via string concatenation
const userId = req.query.id;
const query = "SELECT * FROM users WHERE id = " + userId;
db.execute(query);

// S003 — Command Injection via exec
const filename = req.body.filename;
exec("ls -la " + filename);

// S005 — innerHTML XSS
const name = req.query.name;
document.getElementById("output").innerHTML = name;

// S006 — dangerouslySetInnerHTML
const html = "<b>Hello</b>";
const el = <div dangerouslySetInnerHTML={{ __html: html }} />;

// S007 — document.write()
document.write("<h1>" + location.hash + "</h1>");

// S009 — Prototype pollution
Object.assign(config, req.body);

// S010 — Math.random() for security
const token = Math.random().toString(36);

// S011 — HTTP instead of HTTPS
fetch("http://api.example.com/data");

// S012 — Disabled SSL verification
const agent = https.request({ rejectUnauthorized: false });

// S013 — Weak hash
const hash = crypto.createHash("md5").update(password).digest("hex");

// S014 — Sensitive data in console.log
console.log("User token:", token);
console.log("Password:", password);
