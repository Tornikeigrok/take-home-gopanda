const request = require('supertest');
const URL = "http://localhost:4001/";



test("POST / registerUser - should return 409 if the email already exists", async()=>{
    const res = await request(URL).post("registerUser").send({
        email: "tornike@gmail.com",
        password: "Password123"
    });
    expect(res.status).toBe(409);
});

test("POST / userLogin - Should return 401 if the password is not valid", async()=>{
    const res = await request(URL).post("userLogin").send({
        email: 'tornike@gmail.com',
        password: "sdsdsd1212"
    });
    expect(res.status).toBe(401);
})

test("POST / resetPassword - Should return 404 if the email does not exist", async()=>{
    const res = await request(URL).post("resetPassword").send({
        email: 'dsdfsdfsds@gmail.com',
        password: "passwordnew123"
    });
    expect(res.status).toBe(404);
});


