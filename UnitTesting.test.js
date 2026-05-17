const request = require('supertest');
const URL = "http://localhost:4001/";




//--- Unit Testing AUTH endpoints ---//
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

test("POST / userRegister - Should return 200 if the email is not already present", async()=>{
    const res = await request(URL).post("registerUser").send({
        name: "jonathan williams",
        email: "jonathansd22@gmail.com", 
        password: "password22222"
    });
    expect(res.status).toBe(200);
});

test("POST / userLogin - Should return 200 if the credentials match", async()=>{
    const res = await request(URL).post("userLogin").send({
        email: "tornike@gmail.com", 
        password: "Toko12345"
    });
    expect(res.status).toBe(200);
});

test("POST / resetPassword - Should return 200 if email exists", async()=>{
    const res = await request(URL).post("resetPassword").send({
        email: "tornike@gmail.com", 
        password: "sdsdsdshh22"
    });
    expect(res.status).toBe(200);
});


//--- Unit testing to ensure the scheduling conflict logic works fine ---//

//Get a token
const token = ""; //Populated via beforeAll before the test or get a real, valid token. Removing a valid token for security purposes

test("Should return 409 when overlap is detected", async()=>{
    const res = await request(URL).post("requestBooking").set("Authorization", `Bearer ${token}`).send({
        room_id: 7,
        start_time: "2026-05-17T21:34:00",
        end_time: "2026-05-17T22:06:00"
    })
    expect(res.status).toBe(409);
});

test("Should return 409 when the new booking partially overlaps", async()=>{
    const res = await request(URL).post("requestBooking").set('Authorization', `Bearer ${token}`)
    .send({
        room_id: 8,
        start_time: "2026-05-18T16:25:00",
        end_time: "2026-05-18T17:24:00"
    })
    expect(res.status).toBe(409);
})



