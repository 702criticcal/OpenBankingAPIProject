const express = require("express");
const app = express();
const request = require("request");
port = 3000;
const jwt = require("jsonwebtoken");
const auth = require("./lib/auth");

var mysql = require("mysql");

var connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "sjs514912",
  database: "fintech",
});

connection.connect();

app.set("views", __dirname + "/views");
app.set("view engine", "ejs");

// express가 데이터를 받을 수 있게 하는 코드
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static(__dirname + '/public'));

app.get("/signup", function (req, res) {
  res.render("signup");
});

app.get("/login", function (req, res) {
  res.render("login")
});

app.get("/authTest", auth, function (req, res) {
  res.json("환영합니다 우리 고객님");
});

app.get("/main", function (req, res) {
  res.render("main");
});

app.get("/balance", function (req, res) {
  res.render("balance");
});

app.get("/qrcode", function (req, res) {
  res.render("qrcode");
});

app.get("/qrreader", function (req, res) {
  res.render("qrreader");
});

app.get("/authResult", function (req, res) {
  // code라고 지정한 부분이 변수에 들어가게 됨.
  var authCode = req.query.code;
  console.log("인증코드 : ", authCode);

  var option = {
    method: "POST",
    url: "https://testapi.openbanking.or.kr/oauth/2.0/token",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    form: {
      code: authCode,
      client_id: "Bkc8fNLBdapknJ5SUKzmaXoJnR07lIotBs0WJXJS",
      client_secret: "gBCcTap3Ipmj9kB05wisAjTP9rdPPxnDjtCUy0Vs",
      redirect_uri: "http://localhost:3000/authResult",
      grant_type: "authorization_code"
    },
  };
  request(option, function (error, response, body) {
    var accessRequestResult = JSON.parse(body);
    console.log(accessRequestResult);
    res.render("resultChild", { data: accessRequestResult });
  });
});

app.post('/signup', function (req, res) {
  console.log(req.body);
  var userName = req.body.userName;
  var userEmail = req.body.userEmail;
  var userPassword = req.body.userPassword;
  var userAccessToken = req.body.userAccessToken;
  var userRefreshToken = req.body.uesrRefreshToken;
  var userSeqNo = req.body.userSeqNo;

  var sql =
    "INSERT INTO `user` (`name`, `email`, `password`, `accesstoken`, `refreshtoken`, `userseqno`) VALUES (?, ?, ?, ?, ?, ?)";
  connection.query(
    sql,
    [
      userName,
      userEmail,
      userPassword,
      userAccessToken,
      userRefreshToken,
      userSeqNo,
    ],
    function (error, results, fields) {
      if (error) throw error;
      else {
        console.log("sql :", this.sql);
        res.json(1);
      }
    }
  );
});

app.post("/login", function (req, res) {
  console.log("사용자 입력정보 :", req.body);
  var userEmail = req.body.userEmail;
  var userPassword = req.body.userPassword;
  var sql = "SELECT * FROM user WHERE email = ?";
  connection.query(sql, [userEmail], function (error, results, fields) {
    if (error) throw error;
    else {
      if (results.length == 0) {
        res.json("등록되지 않은 아이디 입니다.");
      } else {
        var dbPassword = results[0].password;
        if (userPassword == dbPassword) {
          // tokenKey는 원래는 복잡한 값으로 설정
          var tokenKey = "fintech";
          jwt.sign(
            {
              userId: results[0].id,
              userEmail: results[0].email,
            },
            tokenKey,
            {
              expiresIn: "10d",
              issuer: "fintech.admin",
              subject: "user.login.info",
            },
            function (err, token) {
              console.log("로그인 성공", token);
              res.json(token);
            }
          );
        } else {
          res.json("비밀번호가 다릅니다!");
        }
      }
    }
  });
});

app.post('/list', auth, function (req, res) {
  var userId = req.decoded.userId;
  var sql = "SELECT * FROM user WHERE id = ?";
  connection.query(sql, [userId], function (err, results) {
    if (err) {
      console.error(err);
      throw err;
    }
    else {
      console.log("list에서 조회한 개인 값 :", results);
      var option = {
        method: "GET",
        url: "https://testapi.openbanking.or.kr/v2.0/user/me",
        headers: {
          "Authorization": "Bearer " + results[0].accesstoken,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        qs: {
          user_seq_no: results[0].userseqno,
        },
      };
      request(option, function (error, response, body) {
        var listResult = JSON.parse(body);
        console.log(listResult);
        res.json(listResult);
      });
    }
  });
});

app.post("/balance", auth, function (req, res) {
  var userId = req.decoded.userId;
  var fin_use_num = req.body.fin_use_num;

  console.log("유저 아이디, 핀테크번호 : ", userId, fin_use_num);
  var countnum = Math.floor(Math.random() * 1000000000) + 1;
  var transId = "T991641540U" + countnum; //이용기과번호 본인것 입력

  var sql = "SELECT * FROM user WHERE id = ?";
  connection.query(sql, [userId], function (err, results) {
    if (err) {
      console.error(err);
      throw err;
    } else {
      console.log(("list 에서 조회한 개인 값 :", results));
      var option = {
        method: "GET",
        url: "https://testapi.openbanking.or.kr/v2.0/account/balance/fin_num",
        headers: {
          Authorization: "Bearer " + results[0].accesstoken,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        //form 형태는 form / 쿼리스트링 형태는 qs / json 형태는 json ***
        qs: {
          bank_tran_id: transId,
          fintech_use_num: fin_use_num,
          tran_dtime: "20200716112900",
          //#자기 키로 시크릿 변경
        },
      };
      request(option, function (error, response, body) {
        var balanceResult = JSON.parse(body);
        console.log(balanceResult);
        res.json(balanceResult);
      });
    }
  });
});

app.post("/transactionList", auth, function (req, res) {
  var userId = req.decoded.userId;
  var fin_use_num = req.body.fin_use_num;
  console.log("유저 아이디, 핀테크번호 : ", userId, fin_use_num);

  var countnum = Math.floor(Math.random() * 1000000000) + 1;
  var transId = "T991641540U" + countnum; //이용기과번호 본인것 입력

  var sql = "SELECT * FROM user WHERE id = ?";
  connection.query(sql, [userId], function (err, results) {
    if (err) {
      console.error(err);
      throw err;
    } else {
      console.log(("list 에서 조회한 개인 값 :", results));
      var option = {
        method: "GET",
        url: "https://testapi.openbanking.or.kr/v2.0/account/transaction_list/fin_num",
        headers: {
          Authorization: "Bearer " + results[0].accesstoken,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        //form 형태는 form / 쿼리스트링 형태는 qs / json 형태는 json ***
        qs: {
          bank_tran_id: transId,
          fintech_use_num: fin_use_num,
          inquiry_type: "A",
          inquiry_base: "D",
          from_date: "20190101",
          to_date: "20200716",
          sort_order: "D",
          tran_dtime: "20200716143000",
        },
      };
      request(option, function (error, response, body) {
        var listResult = JSON.parse(body);
        console.log(listResult);
        res.json(listResult);
      });
    }
  });
});

app.post("/withdraw", auth, function (req, res) {
  var userId = req.decoded.userId;
  var fin_use_num = req.body.fin_use_num;
  var amount = req.body.amount;
  var to_fin_use_num = req.body.to_fin_use_num;
  console.log(
    "유저 아이디, 출금 핀테크번호, 입금할 핀테크번호 : ",
    userId,
    fin_use_num,
    to_fin_use_num,
    amount
  );

  var countnum = Math.floor(Math.random() * 1000000000) + 1;
  var transId = "T991641540U" + countnum;

  var sql = "SELECT * FROM user WHERE id = ?";
  connection.query(sql, [userId], function (err, results) {
    if (err) {
      console.error(err);
      throw err;
    } else {
      console.log(("list 에서 조회한 개인 값 :", results));
      var option = {
        method: "POST",
        url: " https://testapi.openbanking.or.kr/v2.0/transfer/withdraw/fin_num",
        headers: {
          Authorization: "Bearer " + results[0].accesstoken,
          "Content-Type": "application/json",
        },
        //form 형태는 form / 쿼리스트링 형태는 qs / json 형태는 json ***
        json: {
          "bank_tran_id": transId,
          "cntr_account_type": "N",
          "cntr_account_num": "3643766309",
          "dps_print_content": "쇼핑몰환불",
          "fintech_use_num": fin_use_num,
          "wd_print_content": "오픈뱅킹출금",
          "tran_amt": "1000",
          "tran_dtime": "20200721112455",
          "req_client_name": "신준수",
          "req_client_bank_code": "097",
          "req_client_account_num": "3643766309",
          "req_client_num": "1100760560",
          "transfer_purpose": "ST",
          "recv_client_name": "신준수",
          "recv_client_bank_code": "097",
          "recv_client_account_num": "6535155954"
        },
      };
      request(option, function (error, response, body) {
        console.log(body);
        var countnum2 = Math.floor(Math.random() * 1000000000) + 1;
        var transId2 = "T991641540U" + countnum2;

        var option = {
          method: "POST",
          url:
            "https://testapi.openbanking.or.kr/v2.0/transfer/deposit/fin_num",
          headers: {
            Authorization:
              "Bearer " +
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJUOTkxNjQxNTQwIiwic2NvcGUiOlsib29iIl0sImlzcyI6Imh0dHBzOi8vd3d3Lm9wZW5iYW5raW5nLm9yLmtyIiwiZXhwIjoxNjAzMDg2NjgyLCJqdGkiOiIyMjVmNDFiYi0wMDFjLTQ1YmEtYjA4Ni1lNmVlZDE4YWNhMzAifQ.KwfI8ip7hWiCvSsXcnltZfikSr9Cp1yuuCzjoULmS6k",
            "Content-Type": "application/json",
          },
          //form 형태는 form / 쿼리스트링 형태는 qs / json 형태는 json ***
          json: {
            cntr_account_type: "N",
            cntr_account_num: "6535155954",
            wd_pass_phrase: "NONE",
            wd_print_content: "환불금액",
            name_check_option: "on",
            tran_dtime: "20200721143240",
            req_cnt: "1",
            req_list: [
              {
                tran_no: "1",
                bank_tran_id: transId2,
                fintech_use_num: to_fin_use_num,
                print_content: "오픈뱅킹입금",
                tran_amt: amount,
                req_client_name: "신준수",
                req_client_fintech_use_num: "199164154057885117705532",
                req_client_num: "1100760560",
                transfer_purpose: "ST",
              },
            ],
          },
        };
        request(option, function (error, response, body) {
          console.log(body);
        });
      });
    }
  });

});

app.listen(port, function () {
  console.log("Example app listening at http://localhost:" + port);
});
