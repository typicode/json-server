# Base image
FROM node:12.18.3
# Create app directory
WORKDIR /usr/src/app
# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install
# Bundle app source
COPY . /usr/src/app
COPY ./config-example/json-server.json .

EXPOSE 3000
CMD [ "npm", "start" ]