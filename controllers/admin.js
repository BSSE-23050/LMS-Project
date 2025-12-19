var express = require('express');
var router = express.Router();
var userModel = require.main.require('./models/userModel');
var bookModel = require.main.require('./models/bookModel');
var validationRules = require.main.require('./validation_rules/rules');
var asyncValidator = require('async-validator-2');

// --- S3 UPLOAD SETUP ---
var upload = require.main.require('./models/s3Upload'); // Import your middleware
// -----------------------

router.get('/home', (req, res)=> {
    userModel.getAll((users)=> {
        if (!users) users = []; 
        
        bookModel.getAll((books)=> {
            if (!books) books = [];

            bookModel.getAllBorrowedBooks((borrowed)=> {
                if (!borrowed) borrowed = [];

                bookModel.totalBorrowed30((mostBorrowed)=> {
                    if (!mostBorrowed) mostBorrowed = [];

                    bookModel.mostRequestedBook((mostRequested)=> {
                        var mrb_data = mostRequested ? mostRequested : null;

                        bookModel.mostBorrowedBook((mostBorrowedBook)=> {
                            var mbb_data = mostBorrowedBook ? mostBorrowedBook : null;

                            res.render('admin/home', {
                                usr: users.length, 
                                bk: books.length, 
                                brwd: borrowed.length, 
                                mb: mostBorrowed.length, 
                                mrb: mrb_data, 
                                mbb: mbb_data 
                            });
                        });
                    });
                });
            });
        });
    });
});

router.get('/profile', (req, res)=> {
    userModel.getUser(req.session.admin, (result)=> {
        if(!result){
            res.send("invalid!");
        }
        else {
            res.render('admin/profile', {res: result});
        }
    });
});

router.get('/profile/edit', (req, res)=> {
    userModel.getUser(req.session.admin, (result)=> {
        if(!result){
            res.send("invalid");
        }
        else {
            res.render('admin/profile-edit', {res: result, errs: []});
        }
    });
});

// S3 INTEGRATED POST ROUTE
router.post('/profile/edit', upload.single('profile_pic'), (req, res)=> {
    var rules = validationRules.users.update;
    var validator = new asyncValidator(rules);
    
    // Logic: Use new S3 URL if uploaded, otherwise keep the old one
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

    validator.validate(data, (errors, fields)=> {
        if(!errors){
            userModel.updateUser(data, (result)=> {
                if(!result){
                    res.send('invalid');
                }
                else {
                    res.redirect('/admin/profile');
                }
            });
        }
        else {
            res.render('admin/profile-edit', {errs: errors, res: data});
        }
    });
});

router.get('/changepass', (req, res)=> {
    userModel.getUser(req.session.admin, (result)=> {
        if(!result){
            res.send("invalid!");
        }
        else {
            res.render('admin/change-password', {res: result, errs: [], success: []});
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
                            res.render('admin/change-password', {errs:[], res: [], success: [{message: "Password changed successfully"}]});
                        }
                    });
                }
                else {
                    res.render('admin/change-password', {errs:[{message: "Your new passwords don't match!"}], res: [], success: []});
                }
            }
            else {
                res.render('admin/change-password', {errs: errors, res: [], success: []});
            }
        });
    }
    else {
        res.render('admin/change-password', {errs: [{message: "Your old passsword does not match!"}], res: [], success: []});
    }

});

router.get('/books', (req, res)=> {
    bookModel.getAll((result)=> {
        if(!result){
            res.send("Invalid");
        }
        else {
            res.render('admin/books', {res: result, errs: []});
        }
    });
});

router.post('/books', (req, res)=> {
    bookModel.searchBy(req.body.searchBy, req.body.word, (result)=> {
        if(!result){
            res.render('admin/books', {res: [], errs: [{message: "No results found!"}]});
        }
        else {
            res.render('admin/books', {res: result, errs: []})
        }
    });
});

router.get('/customers', (req, res)=> {
    userModel.getAll((result)=> {
        if(!result){
            res.send("Invalid");
        }
        else {
            res.render('admin/customers', {res: result, errs: []});
        }
    });
});

router.post('/customers', (req, res)=> {
    userModel.searchBy(req.body.searchBy, req.body.word, (result)=> {
        if(!result){
            res.render('admin/customers', {res: [], errs: [{message: "No results found!"}]});
        }
        else {
            res.render('admin/customers', {res: result, errs: []})
        }
    });
});

router.get('/customers/add', (req, res)=> {
    res.render('admin/customers-add', {errs: [], success: [], data: []});
});

router.post('/customers/add', (req, res)=> {
    var data = {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        password: req.body.password,
        address: req.body.address,
        gender: req.body.gender
    };

    var rules = validationRules.users.create;
    var validator = new asyncValidator(rules);

    validator.validate(data, (errors, fields)=> {
        if(!errors){
            userModel.createUser(data, (result)=> {
                if(!result){
                    res.send("Invalid");
                }
                else {
                    res.render('admin/customers-add', {errs: [], success: [{message: "Customer added successfully!"}], data: []});
                }
            });
        }
        else {
            res.render('admin/customers-add', {errs: errors, success: [], data});
        }
    });
});

router.get('/books/add', (req, res)=> {
    res.render('admin/books-add', {errs: [], success: [], data: []});
});

router.post('/books/add', (req, res)=> {
    var data = {
        genre: req.body.genre,
        title: req.body.title,
        author: req.body.author,
        publisher: req.body.publisher,
        edition: req.body.edition,
        isbn: req.body.isbn,
        pages: req.body.pages
    };

    var rules = validationRules.books.create;
    var validator = new asyncValidator(rules);

    validator.validate(data, (errors, fields)=> {
        if(!errors){
            bookModel.createBook(data, (result)=> {
                if(!result){
                    res.send("Invalid");
                }
                else {
                    res.render('admin/books-add', {errs: [], success: [{message: "Book added successfully!"}], data: []});
                }
            });
        }
        else {
            res.render('admin/books-add', {errs: errors, success: [], data});
        }
    });
});

router.get('/books/edit/:id', (req, res)=> {
    bookModel.getBook(req.params.id, (result)=> {
        if(result.length == 0){
            res.send("Invalid");
        }
        else {
            res.render('admin/books-edit', {res: result, errs: [], success: []});
        }
    });
});

router.post('/books/edit/:id', (req, res)=> {
    var data = {
        genre: req.body.genre,
        title: req.body.title,
        author: req.body.author,
        publisher: req.body.publisher,
        edition: req.body.edition,
        isbn: req.body.isbn,
        pages: req.body.pages
    };
    var book_id = req.body.book_id;

    var rules = validationRules.books.create;
    var validator = new asyncValidator(rules);

    validator.validate(data, (errors, fields)=> {
        if(!errors){
            bookModel.updateBook(book_id, data, (result)=> {
                if(!result){
                    res.send("Invalid");
                }
                else {
                    res.render('admin/books-edit', {res: result, errs:[], success: [{message: "Book updated successfully!"}]});
                }
            });
        }
        else {
            res.render('admin/books-edit', {res: data, errs: errors, success: []})
        }
    });
});

router.get('/customers/edit/:id', (req, res)=> {
    userModel.getUser(req.params.id, (result)=> {
        if(result.length == 0){
            res.send("Invalid");
        }
        else {
            res.render('admin/customers-edit', {res: result, errs: [], success: []});
        }
    });
});

router.post('/customers/edit/:id', (req, res)=> {
    var data = {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        password: req.body.password,
        address: req.body.address,
        gender: req.body.gender
    };
    var customer_id = req.body.user_id;

    var rules = validationRules.users.create;
    var validator = new asyncValidator(rules);

    validator.validate(data, (errors, fields)=> {
        if(!errors){
            userModel.updateCustomer(customer_id, data, (result)=> {
                if(!result){
                    res.send("Invalid");
                }
                else {
                    res.render('admin/customers-edit', {res: result, errs:[], success: [{message: "Customer updated successfully!"}]});
                }
            });
        }
        else {
            res.render('admin/customers-edit', {res: data, errs: errors, success: []});
        }
    });
});

router.get('/customers/profile/:id', (req, res)=> {
    userModel.getUser(req.params.id, (result)=> {
        if(result.length == 0){
            res.send("Invalid");
        }
        else {
            res.render('admin/customers-profile', {res: result});
        }
    });
});

router.get('/customers/delete/:id', (req, res)=> {
    userModel.getUser(req.params.id, (result)=> {
        if(result.length == 0){
            res.send("Invalid");
        }
        else {
            res.render('admin/customers-delete', {res: result});
        }
    });
});

router.post('/customers/delete/:id', (req, res)=> {
    userModel.deleteUser(req.body.user_id, (result)=> {
        if(result.length == 0){
            res.send("Invalid");
        }
        else {
            res.redirect('/admin/customers');
        }
    });
});

router.get('/books/delete/:id', (req, res)=> {
    bookModel.getBook(req.params.id, (result)=> {
        if(result.length == 0){
            res.send("Invalid");
        }
        else {
            res.render('admin/books-delete', {res: result});
        }
    });
});

router.post('/books/delete/:id', (req, res)=> {
    bookModel.deleteBook(req.body.book_id, (result)=> {
        if(result.length == 0){
            res.send("Invalid");
        }
        else {
            res.redirect('/admin/books');
        }
    });
});

router.get('/books/:id/issue', (req, res)=> {
    userModel.getAll((result)=> {
        if(!result){
            res.send("Invalid");
        }
        else {
            res.render('admin/books-issue', {res: result, errs: [], success: []});
        }
    });
});

router.post('/books/:id/issue', (req, res)=> {
    var book_id = req.params.id;
    var customer_id = req.body.user_id;

    bookModel.booksIssuedByCustomer(customer_id, (books)=> {
        if(!books){
            res.send("Invalid");
        }
        else {
            if(books.length <= 2){
                bookModel.setIssueDate(book_id, customer_id, (result)=> {
                    // Logic handled in callback chain
                });
                bookModel.issueBook(book_id, customer_id, (result)=> {
                    if(!result){
                        res.send("Invalid");
                    }
                    else {
                        res.redirect('/admin/books');
                    }
                });
            }
            else{
                userModel.getAll((result)=> {
                    if(!result){
                        res.send("Invalid");
                    }
                    else {
                        res.render('admin/books-issue', {res: result, errs: [{message: "This customer has already issued 3 books, please unissue one first!"}], success: []});
                    }
                });
            }
        }
    });
});

router.get('/books/issued', (req, res)=> {
    bookModel.getAll((result)=> {
        if(!result){
            res.send("Invalid!");
        }
        else {
            res.render('admin/issued-books', {res: result});
        }
    });
});

router.post('/books/issued', (req, res)=> {
    bookModel.unissueBook(req.body.book_id, (result)=> {
        if(!result){
            res.send("Invalid");
        }
        else {
            res.redirect('/admin/books');
        }
    });
});

router.get('/books/requested', (req, res)=> {
    bookModel.getRequestedBooks((result)=> {
        if(!result){
            res.send("Invalid");
        }
        else {
            res.render('admin/books-requested', {res: result, errs: []});
        }
    });
});

router.post('/books/requested', (req, res)=> {
    bookModel.bookRequestSearch(req.body.searchBy, req.body.word, (result)=> {
        if(!result){
            res.render('admin/books-requested', {res: [], errs: [{message: "No results found!"}]});
        }
        else {
            res.render('admin/books-requested', {res: result, errs: []})
        }
    });
});

module.exports = router;