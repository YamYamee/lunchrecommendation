const express = require('express'); 
const app = express(); // Express 활용
const session = require('express-session'); //Session을 위해서 사용
const passport = require('passport'); //passport 라이브러리 활용
const GoogleStrategy = require('passport-google-oauth2').Strategy; // 구글의 로그인 전략
const mongoose = require('mongoose');

const GOOGLE_CLIENT_ID = '631223913006-3nabihp7le0pfu1ipdf2oua51jha6ups.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';

app.set('view engine', 'ejs'); //ejs 라이브러리 활용;
app.use('/public', express.static('public')); // public 경로 사용

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

// express session 연결
app.use(
    session({
        secret: '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',
        resave: false,
        saveUninitialized: false,
    })
);

// passport 초기화 및 session 연결
app.use(passport.initialize());
app.use(passport.session());


// login이 최초로 성공했을 때만 호출되는 함수
// done(null, user.id)로 세션을 초기화 한다.
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

// 사용자가 페이지를 방문할 때마다 호출되는 함수
// done(null, id)로 사용자의 정보를 각 request의 user 변수에 넣어준다.
passport.deserializeUser(function (id, done) {
    done(null, id);
});

// Google login 전략
// 로그인 성공 시 callback으로 request, accessToken, refreshToken, profile 등이 나온다.
passport.use(
    new GoogleStrategy(
        {
            clientID: '631223913006-3nabihp7le0pfu1ipdf2oua51jha6ups.apps.googleusercontent.com',
            clientSecret: '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',
            callbackURL: 'https://whattoeat.run.goorm.site/login/redirect',
            passReqToCallback: true,
        },
        function (request, accessToken, refreshToken, profile, done) {
            User.find({ userid: profile.id }).then((user) => {
                if (user.length == 0) {
                    User.create({
                        name: profile.displayName,
                        pic: profile.picture,
                        userid: profile.id,
                    });
                }
            });

            return done(null, profile);
        }
    )
);

mongoose
    .connect(
        'mongodb+srv://peleusdd:lee95749574@cluster0.9dn4979.mongodb.net/lunch?retryWrites=true&w=majority'
    )
    .then(() => {
        console.log('Connected to MongoDB => UserAPI');
    })
    .catch((err) => {
        console.log(err);
    });

const postSchema = new mongoose.Schema({
    writer: { type: String },
    writerName: { type: String },
    writerPic: { type: String },
    postId: { type: Number },
    date: { type: String },
    likes: { type: Number },
    comments: { type: Number },
    likesList: { type: Array },
    content: { type: String },
});

const commentSchema = new mongoose.Schema({
    writer: { type: String },
    writerName: { type: String },
    writerPic: { type: String },
    postId: { type: Number },
    date: { type: String },
    content: { type: String },
	motherPost: { type: Number },
});

const userData = new mongoose.Schema({
    name: { type: String },
    pic: { type: String },
    userid: { type: String },
});

const totalpost = new mongoose.Schema({
    number: { type: Number },
});

const totalcomment = new mongoose.Schema({
    number: { type: Number },
});

const Post = mongoose.model('Post', postSchema);
const User = mongoose.model('User', userData);
const PostNumber = mongoose.model('PostNumber', totalpost);
const CommentNumber = mongoose.model('CommentNumber', totalcomment);
const Comment = mongoose.model('Comment', commentSchema);

function checkLogin(req, res, next) {
    if (req.user) {
        next();
    } else {
        res.send("<script>alert('로그인 안하셨는데용? 로그인페이지로 이동할게용')</script><script>window.location.replace('https://whattoeat.run.goorm.site/login')</script>");
    }
}

app.listen(3001, function () {
    console.log('server is running on 3001');
});


app.get('/', function (req, res) {
    Post.find({}).then((post) => {
        if (req.user) {
            res.render('main.ejs', { data: post, userid: req.user });
        } else {
            res.render('main.ejs', { data: post, userid: 'NOTYET' });
        }
    });
});


app.get('/write', checkLogin, function (req, res) {
    console.log(req.user);
    User.find({ userid: req.user }).then((user) => {
        res.render('write.ejs', { data: user });
    });
});

app.get('/data', (req, res) => {
    const data = { key: req.user }; // 서버에서 생성한 데이터
    res.json(data); // 데이터를 JSON 형식으로 응답
});

app.put('/like', (req, res) => {
    let hasLiked = false;
	
	if(req.body.likePerson == undefined) {
		res.json({message : "로그인 하세욧!!. 글쓰기 버튼을 누르면 로그인 페이지로 이동됩니다."});
	} else {
		Post.find({ postId: Number(req.body.postid) })
        .then((likeList) => {
            for (let i = 0; i < likeList[0].likesList.length; i++) {
                if (likeList[0].likesList[i] === req.body.likePerson) {
                    hasLiked = true;
                    break;
                }
            }
        })
        .then(() => {
            if (hasLiked) {
				console.log("haha");
                res.json({ message: '이미 좋아요를 누르셨어용' });
            } else {
                Post.findOneAndUpdate({ postId: Number(req.body.postid) }, { $inc: { likes: 1 } })
                    .then((result) => {
                        console.log('Update successful!');
                    })
                    .then(() => {
                        Post.findOneAndUpdate(
                            { postId: Number(req.body.postid) },
                            { $push: { likesList: req.body.likePerson } }
                        )
                            .then((result) => {
                                console.log(result);
                                console.log('Update successful!');
                                res.json({ message: '좋아요 누르기 성공!' });
                            })
                            .catch((err) => {
                                console.error('Error:', err);
                                res.status(500).send('Error occurred during update.');
                            });
                    })
                    .catch((err) => {
                        console.error('Error:', err);
                        res.status(500).send('Error occurred during update.');
                    });
            }
        });
	}
});

app.delete('/delete', function (req, res) {
    Post.deleteOne({ postId: req.body.postid })
        .then(function () {
            console.log('Data deleted'); // Success
        })
        .catch(function (error) {
            console.log(error); // Failure
        });
    res.end();
});

app.delete('/commentdelete', function (req, res) {
    Comment.deleteOne({ postId: req.body.postid })
        .then(function () {
            console.log('Data deleted'); // Success
        })
        .catch(function (error) {
            console.log(error); // Failure
        });
    res.end();
});

app.post('/upload', function (req, res) {
    let totalPost = 0;
	const time = new Date();
	time.setHours(time.getHours()+9);

    PostNumber.find({}).then((number) => {
        totalPost = number[0].number;
        console.log(totalPost);
		

        PostNumber.updateOne({ id: 123 }, { number: totalPost + 1 })
            .then((result) => {
                console.log('sucess!');
            })
            .then(() => {
                User.find({ userid: req.user }).then((user) => {
                    console.log(user);
                    Post.create({
                        writer: user[0].userid,
                        writerName: user[0].name,
                        writerPic: user[0].pic,
                        postId: totalPost,
                        date: time.toLocaleString(),
                        content: req.body.content,
                    }).then(() => {
                        console.log('success!');
                    });
                });
            })
            .catch((err) => {});
    });

    res.end();
});

app.post('/commentupload', function (req, res) {
    let totalComment = 0;

    CommentNumber.find({}).then((number) => {
        totalComment = number[0].number;
        console.log(totalComment);

        CommentNumber.updateOne({id: 123 }, { number: totalComment + 1 })
            .then((result) => {
                console.log('sucess!');
            })
            .then(() => {
                User.find({ userid: req.user }).then((user) => {
                    console.log(user);
                    Comment.create({
                        writer: user[0].userid,
                        writerName: user[0].name,
                        writerPic: user[0].pic,
                        postId: totalComment,
                        date: new Date(),
                        likesList: [],
                        content: req.body.content,
						motherPost: req.body.motherPost
                    }).then(() => {
                        console.log('success!');
                    });
                });
            })
            .catch((err) => {});
    });

    res.end();
});

app.get('/suggestion', function (req, res) {
    res.render('suggestion.ejs');
});

app.get('/detail/:id', checkLogin, function (req, res) {
	Post.find({postId :req.params.id}).then((post) => {
		User.find({userid : req.user}).then((id) => {
		Comment.find({motherPost : req.params.id}).then((comment) => {
		res.render('detail.ejs', {data: post, id : id, comment: comment, userid : "108758216885974271525"});
		})
		})
	})
});

// login 화면
// 이미 로그인한 회원이라면(session 정보가 존재한다면) main화면으로 리다이렉트
app.get('/login', (req, res) => {
    if (req.user) {
        res.redirect('/');
    } else {
        res.render('login.ejs');
    }
});

// google login 화면
app.get('/auth/google', passport.authenticate('google', { scope: ['email', 'profile'] }));

app.get(
    '/login/redirect',
    passport.authenticate('google', {
        successRedirect: '/',
        failureRedirect: '/login',
    })
);

app.use((req, res, next) => {
  res.status(404).render('404.ejs');
});