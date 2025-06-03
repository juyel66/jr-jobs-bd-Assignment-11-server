const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware 

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://assignment-11-d5563.web.app',
    'https://jr-job-bd.netlify.app',
    'https://jobs-bd.netlify.app/'
    
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@juyel.zm7wayi.mongodb.net/?retryWrites=true&w=majority&appName=JUYEL`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middleware 
const logger = (req, res, next)=>{
  console.log('log: info:',req.method, req.url);
  next()
}
const verifyToken = (req, res, next) =>{
  const token = req.cookies.token;
  // console.log('token in the middleware', token);
  // no token available 
  if(!token){
    return res.status(401).send({message: 'unauthorized access'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_JWT, (err, decoded) =>{
    if(err){
      return res.status(401).send({message: 'unauthorize access'})
    }
    req.user = decoded;
    next()
  })
  // next();
}






async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const allJobsCollection = client.db('AllJobs').collection('jobs')
    const appliedJobsCollection = client.db('AllJobs').collection('applied')





    

    // JWT generate 
    app.post('/jwt',logger, async(req, res)=>{
      const user = req.body;
      console.log('user for token', user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET_JWT,{
        expiresIn: '365d'
      })
      res.cookie('token',token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      })
      .send({success: true})
    })

    app.post('/logOut', async(req,res) =>{
      const user = req.body;
      console.log('logging out', user)
      res.clearCookie('token', {maxAge:0}).send({success: true})
    })








    // get all data 
    app.get('/jobs',async(req,res)=>{
      const result = await allJobsCollection.find().toArray();
      res.send(result);
    })

    // single data 
    app.get('/jobs/:id', async(req,res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await allJobsCollection.findOne(query);
      res.send(result);
    })
    
    // delete job 
    // app.get('/jobs/:id', async(req,res) =>{
    //   const id = req.params.id;
    //   const query = {_id: new ObjectId(id)}
    //   const result = await allJobsCollection.deleteOne(query);
    //   res.send(result);
    // })

     // delete operations 
     app.delete('/jobs/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await allJobsCollection.deleteOne(query);
      res.send(result)

    })

    // update job 

    app.put('/jobs/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const options = {upsert: true};
      const updateJob = req.body;
      const job = {
        $set: {
          ...updateJob
          // jobTitle: updateJob.jobTitle,
          // jobCategory: updateJob.jobCategory,
          // jobDescription: updateJob.jobDescription,
          // jobPostingDate: updateJob.jobPostingDate,
          // deadline: updateJob.deadline,
          // jobBannerUrl: updateJob.jobBannerUrl,
          // minimumPrice: updateJob.minimumPrice,
          // maximumPrice: updateJob.maximumPrice,
          // description: updateJob.description
        }
      }
      const result = await allJobsCollection.updateOne(filter, job, options)
      res.send(result)


    })


    // save applied data in database 
    app.post('/applied', async(req,res)=>{
      const appliedData = req.body;
      // check if its a duplicate data 
      const query = {email: appliedData.email,
        id: appliedData.id}
      const alreadyApplied = await appliedJobsCollection.findOne(query);

      // return console.log(alreadyApplied);
      if(alreadyApplied){
        return res 
        .status(400)
        .send('You have already applied this job')
      }

      const result = await appliedJobsCollection.insertOne(appliedData);
      res.send(result);
    })



    app.get('/applied', logger, verifyToken, async (req, res) => {
      try {
       
        if (req.user.email !== req.query.buyer_email) {
          return res.status(403).send({ message: 'Forbidden access' });
        }
    
        const result = await appliedJobsCollection.find({ email: req.query.buyer_email }).toArray();
        res.send(result);
      } catch (error) {
        console.error('Error fetching applied jobs:', error);
        res.status(500).send({ message: 'Internal server error' });
      }
    });
    
    

    app.get('/applied/:id', async(req,res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await appliedJobsCollection.findOne(query);
      res.send(result);
    })



    // save job data in database 
    app.post('/jobs', async(req,res)=>{
      const jobData = req.body;
      // if (req.user.email !== req.query.buyer_email) {
      //   return res.status(403).send({ message: 'Forbidden access' });
      // }
      console.log(jobData)
      const result = await allJobsCollection.insertOne(jobData);
      res.send(result);
    })



    // get all jobs posted by specific user 
    // app.get('/jobs/:email', async(req, res)=>{
    //   const email = req.params.email;
    //   const query = {buyer_email: email}
    //   const result = await allJobsCollection.find({}).toArray()
    //   res.send(result)
    // })




    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/',(req, res)=>{
    res.send('Assignment-11 server is running');
})

app.listen(port, ()=>{
    console.log(`Assignment-11 server is running on port:${port}`)
})