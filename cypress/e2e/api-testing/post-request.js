/// <reference types = "cypress" />

//const { response } = require("express");

//Make unique title by generating a unique string.

describe("Post  Request", () => {
    var titleOfPosts = new Array();
    let randomTitle = Math.random().toString(36).substring(1) + Math.random().toString(36).substring(1);

    it("Create a new post via /posts API", () => {
        cy.request({
            method: "POST",
            url: "http://localhost:3000/posts",
            body: {
                title: randomTitle,
                author: "Sabi M"
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
            body.forEach(function (item) {
                titleOfPosts.push(item["title"]);
            });
            
        }).then(() => {
            var latestPost = titleOfPosts[titleOfPosts.length - 1]
            expect(latestPost).to.equal(randomTitle)
        })
    });
})