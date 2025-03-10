# Use official Node.js image as a base image
FROM node:16

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json
COPY package*.json ./

# Install dependencies (if needed, for any other dependencies)
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose port 3000 to the outside world
EXPOSE 3000

# Command to run the JSON server with npx
CMD ["npx", "json-server", "db.json", "--host", "0.0.0.0", "--port", "3000"]
