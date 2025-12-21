var express = require('express');
var router = express.Router();
var userModel = require.main.require('./models/userModel');
var bookModel = require.main.require('./models/bookModel');
var validationRules = require.main.require('./validation_rules/rules');
var asyncValidator = require('async-validator-2');

// IMPORT THE S3 HELPER WE CREATED
var upload = require.main.require('./models/s3Upload');

router.get('/home', (req, res)=> {
    userModel.totalBooksBorrowedByCustomer(req.session.customer, (booksBorrowed)=> {
        if(!booksBorrowed){
            res.render('customer/home', {tbbbc: 0});
        }
        else {
            res.render('customer/home', {tbbbc: booksBorrowed.length});
        }
    });
});

router.get('/profile', (req, res)=> {
    userModel.getUser(req.session.customer, (result)=> {
        if(!result){
            res.send("invalid!");
        }
        else {
            res.render('customer/profile', {res: result});
        }
    });
});

router.get('/profile/edit', (req, res)=> {
    userModel.getUser(req.session.customer, (result)=> {
        if(!result){
            res.send("invalid");
        }
        else {
            res.render('customer/profile-edit', {res: result, errs: []});
        }
    });
});

router.post('/profile/edit', upload.single('profile_pic'), (req, res) => {
    // 1. Identify the rules for customer update from your rules file
    var rules = validationRules.users.update; 
    var validator = new asyncValidator(rules);
    
    // 2. Extract the S3 URL from Multer or keep the old one
    var profilePicUrl = req.file ? req.file.location : req.body.old_profile_pic;

    var data = {
      user_id: req.body.user_id,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      gender: req.body.gender,
      profile_pic: profilePicUrl // 👈 Handing off the cloud link to the DB
    };

    validator.validate(data, (errors, fields) => {
        if (!errors) {
            userModel.updateUser(data, (result) => {
                if (!result) {
                    res.send('invalid');
                } else {
                    // 3. 🔥 UPDATE THE SESSION: This is why your images were ghosting!
                    // We must update the session so the profile page displays the new data
                    req.session.res = data; 
                    
                    // 4. Redirect to customer profile view
                    res.redirect('/customer/profile');
                }
            });
        } else {
            // 5. If validation fails, stay on the profile with error messages
            console.log("Validation Errors:", errors);
            res.render('customer/profile', {errs: errors, res: data});
        }
    });
});router.get('/changepass', (req, res)=> {
    userModel.getUser(req.session.customer, (result)=> {
        if(!result){
            res.send("invalid!");
        }
        else {
            res.render('customer/change-password', {res: result, errs: [], success: []});
        }
    });
});

router.post('/changepass', (req, res)=> {
    var rules = validationRules.users.changePassword;
    var validator = new asyncValidator(rules);
    var data = {
      oldPassword: req.body.oldPassword,
      newPassword: req.body.newPassword,
      confirmPassword: req.body.confirmPassword
    };

    if(req.body.password == req.body.oldPassword){
        validator.validate(data, (errors, fields)=> {
            if(!errors){
                if(req.body.newPassword == req.body.confirmPassword){
                    userModel.updatePassword(req.body.newPassword, req.body.user_id, (result)=> {
                        if(!result){
                            res.send('invalid');
                        }
                        else {
                            res.render('customer/change-password', {errs:[], res: [], success: [{message: "Password changed successfully"}]});
                        }
                    });
                }
                else {
                    res.render('customer/change-password', {errs:[{message: "Your new passwords don't match!"}], res: [], success: []});
                }
            }
            else {
                res.render('customer/change-password', {errs: errors, res: [], success: []});
            }
        });
    }
    else {
        res.render('customer/change-password', {errs: [{message: "Your old passsword does not match!"}], res: [], success: []});
    }
});

router.get('/books', (req, res)=> {
    bookModel.getUnborrowedBooks((result)=> {
        if(!result){
            res.send("Invalid");
        }
        else {
            res.render('customer/books', {res: result, errs: []});
        }
    });
});

router.post('/books', (req, res)=> {
    bookModel.customerSearch(req.body.searchBy, req.body.word, (result)=> {
        if(!result){
            res.render('customer/books', {res: [], errs: [{message: "No results found!"}]});
        }
        else {
            res.render('customer/books', {res: result, errs: []})
        }
    });
});

router.get('/books/borrowed', (req, res)=> {
    userModel.getUserBorrow(req.session.customer, (result)=> {
        if(!result){
            res.send("Invalid");
        }
        else {
            res.render('customer/borrowed-books', {res: result});
        }
    });
});

router.get('/books/request', (req, res)=> {
    res.render('customer/books-request', {errs: [], success: []});
});

router.post('/books/request', (req, res)=> {
    var data = {
        genre: req.body.genre,
        title: req.body.title,
        author: req.body.author,
        edition: req.body.edition,
        isbn: req.body.isbn
    };

    var rules = validationRules.books.request;
    var validator = new asyncValidator(rules);

    validator.validate(data, (errors, fields)=> {
        if(!errors){
            bookModel.bookRequest(req.session.customer, data, (result)=> {
                if(result.length == 0){
                    res.send("Invalid");
                }
                else {
                    res.render('customer/books-request', {errs: [], success: [{message: "Your request has been noted, thank you!"}]});
                }
            });
        }
        else {
            res.render('customer/books-request', {errs: errors, success: []});
        }
    });
});

router.get('/books/history', (req, res)=> {
    userModel.getUserHistory(req.session.customer, (result)=> {
        if(!result){
            res.send("Invalid");
        }
        else {
            res.render('customer/borrow-history', {res: result});
        }
    });
});

module.exports = router;