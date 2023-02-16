/// <reference types = "cypress" />

//const { response } = require("express");

describe("Post  Request", () => {
    var titleOfPosts = new Array();

    it("Create a new post via /posts API", () => {
        cy.request({
            method: "POST",
            url: "http://localhost:3000/posts",
            body: {
                title: "Want ot learn automation testing?",
                author: "Sabi Anjum"
            }
        }).then(response => {
            expect(response.status).to.eql(201);
        })
    });

    it('Validate title of latest post', () => {
        cy.request({
            method: "GET",
            url: "http://localhost:3000/posts",
            hesders: {
                accept: "application/json"
            }
        }).then(response => {
            let body = JSON.parse(JSON.stringify(response.body))
            body.forEach(function(item) {
                titleOfPosts.push(item["title"]);

                
            });
        }).then(() => {
            var latestPost = titleOfPosts[titleOfPosts.length -1]
            expect(latestPost).to.equal("Want ot learn automation testing?")
        })
    });
})