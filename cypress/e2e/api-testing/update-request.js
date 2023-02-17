/// <reference types = "cypress" />

describe("Update or PUT Request", () => {

    it("Update an existing via posts API", () => {
        cy.request({
            method: "PUT",
            url: "http://localhost:3000/posts/3",
            body: {
                title: "Where can I feel good about my life?",
                author: "Atish M"
            }
        }).then(response => {
            expect(response.status).to.eql(200);
        })
    });
})