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
    // 1. Extract the S3 URL or fall back to the old one
    var profilePicUrl = req.file ? req.file.location : req.body.old_profile_pic;

    var data = {
        user_id: req.body.user_id,
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address,
        gender: req.body.gender,
        profile_pic: profilePicUrl 
    };

    // --- 🕵️‍♂️ DEBUG LOGS ---
    console.log("--- S3 UPLOAD DEBUG ---");
    console.log("Saving to DB URL:", data.profile_pic);

    // Use the validator you already imported at the top of the file!
    var rules = validationRules.users.edit; // Ensure this exists in your rules file
    var validator = new asyncValidator(rules);

    validator.validate(data, (errors, fields) => {
        if (!errors) {
            userModel.updateUser(data, (result) => {
                if (!result) {
                    console.log("❌ Database Update Failed");
                    res.send('invalid');
                } else {
                    console.log("✅ Database Update Success!");
                    
                    // 🔥 SYNC THE SESSION so the UI updates immediately
                    req.session.res = data; 
                    
                    res.redirect('/customer/profile');
                }
            });
        } else {
            console.log("⚠️ Validation Errors:", errors);
            res.render('customer/profile-edit', { errs: errors, res: data });
        }
    });
});
router.get('/changepass', (req, res)=> {
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