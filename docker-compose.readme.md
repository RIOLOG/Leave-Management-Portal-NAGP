Docker Compose

1. What is Docker Compose?

Docker Compose is a tool used to:

Run multiple containers together
Define them in one YAML file (docker-compose.yml)
Start/stop everything using a single command


Without Compose:

docker run ...
docker run ...
docker run ...

With Compose:

docker compose up

It is mainly used for:

Microservices
Backend systems
Databases
Monitoring stack
Local development environments



2. why use Docker Compose?
Docker Compose simplifies the process of managing multiple containers. It allows you to define all your services, networks, and volumes in a single file, making it easier to maintain and share your application setup. With Docker Compose, you can easily start, stop, and scale your services with simple commands, improving efficiency and reducing the chances of errors when managing complex applications. Additionally, it provides a consistent environment for development, testing, and production, ensuring that your application runs the same way across different stages of the development lifecycle.



3. Core Docker Concepts
A. Image

Blueprint/template.

Example:

mongo:7.0

Think:

Class in Java

Images are:

Downloaded once
Stored locally
Reusable

Check:

docker images
B. Container

Running instance of an image.

Think:

Object created from class

Example:

Image -> mongo:7.0
Container -> mongodb-auth

Check running containers:

docker ps

Check all containers:

docker ps -a
4. Docker Compose File

Usually named:

docker-compose.yml

Example:

services:
  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"

This defines:

Which images to use
Ports
Networks
Volumes
Environment variables
5. Important Docker Compose Commands
A. Start Containers
docker compose up

Foreground mode.

Logs visible.

B. Start in Background
docker compose up -d

-d = detached mode.

Containers run in background.

C. Stop Containers
docker compose stop

What happens:

Containers STOP
Containers still exist
Images remain
Data remains

You can restart quickly.

D. Restart Stopped Containers
docker compose start
E. Remove Containers
docker compose down


What happens:
Containers removed
Network removed
Images remain


This is what confused you earlier.

F. Remove Containers + Images
docker compose down --rmi all

Now images also deleted.

G. Remove Volumes Too
docker compose down -v

Deletes:

Database data
Persistent storage

Dangerous for MongoDB/Postgres.



Lifecycle Visualization
docker compose up
        |
        V
Creates containers from images
        |
        V
Running containers

docker compose stop
        |
        V
Stopped containers

docker compose start
        |
        V
Running again

docker compose down
        |
        V
Containers deleted
Images still available


Networking in Docker Compose

Compose automatically creates a network.

Example:

rabbitmq
mongodb
employee-service
leave-service

Can communicate using service names.

Example:

mongodb://mongodb-auth:27017

No need for localhost between containers.

11. Volumes (Very Important)

Volumes persist data.

Without volumes:

Container removed -> database lost

With volumes:

Container removed -> data survives

Example:

volumes:
  mongo-data:

services:
  mongodb:
    image: mongo
    volumes:
      - mongo-data:/data/db



Docker Compose vs Kubernetes

Both are used to manage containers, but they solve different levels of problems.

1. Simple Definition
Docker Compose

Used to:

Run multiple containers on one machine
Mostly for:
Local development
Testing
Small projects

Example:

docker compose up -d
Kubernetes (K8s)

Used to:

Manage containers across many machines (cluster)
Mostly for:
Production systems
Large-scale microservices
Auto-scaling
High availability
2. Real World Analogy
Docker Compose

Think:

Apartment manager

Manages containers in one building (one server).

Kubernetes

Think:

Entire smart city management system

Manages:

Many buildings
Traffic
Failures
Scaling
Load balancing
Health checks
Recovery
3. Architecture Difference
Docker Compose
Single Machine
-------------------
| App Container   |
| MongoDB         |
| RabbitMQ        |
| Redis           |
-------------------

Everything runs on one host.

Kubernetes
Cluster
------------------------------------------------
| Node 1 | Node 2 | Node 3 | Node 4 | Node 5 |
------------------------------------------------
      \      |      |      /
        Kubernetes Control Plane

Containers distributed across multiple servers.

4. Main Purpose
Docker Compose	Kubernetes
Development	Production
Simple setup	Enterprise orchestration
One server	Multi-server cluster
Manual scaling	Auto scaling
Basic networking	Advanced networking



______________________________________________________________________________________________________________________


Docker Compose — Full Understanding 🐳
Two types of services in docker-compose.yml:

# Type 1 — External images (download from Docker Hub):

rabbitmq:
  image: rabbitmq:3-management  ← download from hub.docker.com
  
mongodb-auth:
  image: mongo:7.0              ← download from hub.docker.com

consul:
  image: consul:1.15            ← download from hub.docker.com



# Type 2 — Our own services (build from our code):
auth-service:
  build: ./services/auth-service  ← build from OUR Dockerfile
  
leave-service:
  build: ./services/leave-service ← build from OUR Dockerfile




# How build works for our services:
auth-service has a Dockerfile:
└── services/auth-service/
    ├── index.js
    ├── package.json
    └── Dockerfile          ← recipe to build


Dockerfile says:
FROM node:18-alpine         ← start with Node.js image
COPY package*.json ./       ← copy our files
RUN npm install             ← install dependencies
COPY . .                    ← copy our code
CMD ["node", "index.js"]    ← how to start


When docker compose up runs:
→ Docker reads Dockerfile
→ builds image from OUR code
→ runs it as container ✅

So:
External apps  → downloaded FROM Docker Hub ✅
Our services   → built FROM our code ✅


# Part 1 — External image (download):
rabbitmq:
  image: rabbitmq:3-management
  ports:
    - "5672:5672"      # hostPort:containerPort
  networks:
    - lms-network      # all services on same network

# Part 2 — Our service (build):
auth-service:
  build: ./services/auth-service   # where our Dockerfile is
  ports:
    - "3001:3001"
  environment:
    - JWT_SECRET=${JWT_SECRET}     # from .env file

# Part 3 — Volumes (persist data):
volumes:
  mongodb_auth_data:    # MongoDB data survives container restart

# Part 4 — Networks (services talk to each other):
networks:
  lms-network:
    driver: bridge      # all containers on same virtual network


