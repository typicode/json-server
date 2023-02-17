/// <reference types="cypress" />

describe("Post, Get, Delete Request", () => {
    var comments = new Array();
    let comment = Math.random().toString(36).substring(1) + Math.random().toString(36).substring(1);
    let randomPostId = Math.floor(Math.random() * 1000 + 1);

  it("Create a new comment", () => {
    cy.request({
        method: "POST",
        url: "http://localhost:3000/comments",
        body: {
            body: comment,
            postId: randomPostId
        }
      }).then(response => {
          expect(response.status).to.eql(201)
      })
  });
  it("Locate and assert the new comment", () => {
    cy.request({
        method: "GET",
        url: "http://localhost:3000/comments",
        headers: {
            accept: "application/json"
        }
    }).then(response => {
        let body = JSON.parse(JSON.stringify(response.body));
        body.forEach(function(item) {
            comments.push(item["body"]);
        })
    }).then(() => {
        var latestComment = comments[comments.length -1]
        expect(latestComment).to.eq(comment);
    })
  });
  it("Delete the new comment", () => {
    cy.request({
        method: "DELETE",
        url: "http://localhost:3000/comments/" + comments.length
      }).then((response) => {
        expect(response.status).to.eql(200);
      });
  });
});
