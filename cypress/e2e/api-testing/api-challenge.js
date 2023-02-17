/// <reference types = "cypress" />

/* 
- Create or add an ew comment. 
- Locate and aser most recent comment
- delete the latest comment which was inserted
- the body - key should be unique
- the postid - key should be unique
http://localhost:3000/comments
*/


describe('POST, GET, DELETE Request for /comments API', () => {
    var result1;
    var bodyOfComment = new Array();
    var postIdOfComment = new Array();

    let randomBody = Math.random().toString(36).substring(1) + Math.random().toString(36).substring(1);
    let randomPostId = Math.floor(Math.random() * 1000 +1)
    //let randomPostId = Math.random().toString(36).substring(1) + Math.random().toString(36).substring(1);

    it("Vaidate GET status code of /comments API", () => {
        result1 = cy.request("http://localhost:3000/comments")
        result1.its("status").should("equal", 200)
        //cy.request("http://localhost:3000/comments").as("request2");
        //cy.get("@request2").its("status").should("equal", "200");
    });

    it('Validate /posts api contains the correct keys and values', () => {
        cy.request({
            method: "GET",
            url: "http://localhost:3000/comments",
            hesders: {
                accept: "application/json"
            }
        }).then(response => {
            let body = JSON.parse(JSON.stringify(response.body))
            cy.log(body)

            expect(body[0]).has.property("body", "some comment added from Atish for Sabi");
            expect(body[0]).has.property("postId", 1);
            //expect(body[0]).has.property("author", "typicode 1")  // Assertion failed

            body.forEach(function (item) {
                expect(item).to.have.all.keys("id", "body", "postId");
                cy.log("Comment Body: " + item["body"] + " & Post ID: " + item["postId"]);
            });
        })
    });

    it('Create a new comment via /comments API', () => {
        cy.request({
            method: "POST",
            url: "http://localhost:3000/comments",
            body: {
                body: randomBody,
                postId: randomPostId
            }
        }).then(response => {
            expect(response.status).to.eql(201);
        })
    });

    it('Locate and assert the new comment via /comments API', () => {
        cy.request({
            method: "GET",
            url: "http://localhost:3000/comments",
            headers: {
                accept: "application/json"
            }
        }).then(response => {
            // Formatting the response and store
            let body = JSON.parse(JSON.stringify(response.body));

            // Iterating through each object and storing value for only body array
            body.forEach(function (item) {
                bodyOfComment.push(item["body"]);

            })

            body.forEach(function (item) {
                postIdOfComment.push(item["postId"]);

            })

        }).then(response => {
            let latestBody = bodyOfComment[bodyOfComment.length - 1]
            let latestPostId = postIdOfComment[postIdOfComment.length - 1]
            //expect(latestPost2).equal("Look out the stars. look how they shine for you!");
            expect(latestBody).equal(randomBody);       //can work but not used

            expect(latestBody).to.equal(randomBody);
            expect(latestPostId).to.equal(randomPostId)
        })

    });

    it("Delete the new comment via /comments API", () => {
        cy.request({
            method: "DELETE",
            url: "http://localhost:3000/comments/" + postIdOfComment.length
        }).then(response => {
            expect(response.status).to.eql(200);
        })

    })

});