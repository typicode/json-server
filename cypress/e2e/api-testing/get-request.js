/// <reference types = "cypress" />

describe("Get Request", () => {
    var result;
    it("Validate status code of /posts API", () => {
        result = cy.request("http://localhost:3000");
        result.its("status").should("equal", 200)

        // result.its("status").should("equal", 201) // Assertion for status is failed
    })

    it('Validate /posts api contains the correct keys and values', () => {
        cy.request({
            method: "GET",
            url: "http://localhost:3000/posts",
            hesders: {
                accept: "application/json"
            }
        }).then(response => {
            let body = JSON.parse(JSON.stringify(response.body))
            cy.log(body)

            expect(body[0]).has.property("title", "json-server");
            expect(body[1]).has.property("author", "Sabi");
            //expect(body[0]).has.property("author", "typicode 1")  // Assertion failed

            body.forEach(function(item) {
                expect(item).to.have.all.keys("id", "title", "author");
                cy.log("Author: " + item["author"] + " & Title: " + item["title"] );
            });
        })
    });
})