<?php
//****************************************************************************************************************
// SECURE DATABASE CONNECTION // This will be outside the project folder in a separate file/folder 
//****************************************************************************************************************/
// *********************** START OF ConnectToDB.php *********************** 
Class ConnectToDB {
    var $connect;
    public function __construct($connect){
        $this->con = $connection; 
    }
    static function con() { 
        $conDetails = parse_ini_file("../../../config/config.ini"); // placed outside the www root folder so nobody can gain access to details
        $connect = mysqli_connect( $conDetails['server'], $conDetails['user'], $conDetails['pass'], $conDetails['db'] );   
        if(!$connect) {die('ERROR connecting to DB'.mysqli_connect_error());}
        return $connect;
    }
    public function query($sql){
        // all sql queries go through this function
        $result = mysqli_query($this->con, $sql);
        return $result;
    }
}
// *********************** END OF ConnectToDB.php *********************** 
//*********************************************************************************************************
// SECURITY VALIDATION --> validate.php (<form action="validate.php" method="post"></form>) 
//*********************************************************************************************************/
// *********************** START OF validate.php *********************** 
// this is a separate file in another location. It will run upon submission of the form.
// This page gets loaded upon submitting the form using a post method
include("../../../../ConnectToDB/ConnectToDB.php"); 
	if(isset($_POST['submit'])) {
		// checking the email Input to see that its not blank
		if($_POST['strEmail'] !== ''){
			// the input will be what the user types
            $email = $_POST['strEmail'];
            $password = $_POST["strPassword"];
            $email = mysqli_real_escape_string($connection, $email);
            $password = mysqli_real_escape_string($connection, $password);
			// Checking to see if the email entered matches with the email on the database
            $sqlSelect =  "SELECT * FROM users WHERE strEmail ='.$email.'";
			// adding the validation for email with '@' + '.'
			$reg = "/[a-zA-Z0-9.\-_]{1,}@{1}[a-zA-Z0-9]{3,}[.]{1}[a-zA-Z0-9]{1,}.{0,}/";
			$regCheck = preg_match($reg, $email);
			// if email is valid then its true, else false
            ($regCheck)? $validEmail = true: $validEmail = false;
		}

		// if email matches with database and is written in the correct format then it moves ahead	
		if($validEmail) 
		{
			// fetching data for the specific user from database
            $userLogin = BackEndFunctions::outputData($sqlSelect);
            
			// hashing the password with extra characters for security
			$secretPassword = password_hash($password, PASSWORD_DEFAULT);
			if ($userLogin) {
				// pairing the hashed password with regular password
				$encryptedPass = $userLogin[0]['strPassword'];
				// only if the hashed password in database matches with the new password from form session starts and navigates to dashboard
				if(password_verify($_POST["strPassword"], $encryptedPass)){
					session_start();
                    $_SESSION["userID"] = $userLogin[0]["id"];
                    header('location: ../dashboard.php');  
				}
				else {
					// if the password does not match with database
					header('location: ../index.php?error=wrongpass');		
				}
				
			} else {
				// if the email is not matching with the database
				header('location: ../index.php?error=noUser');
			}
		}
	}// end for isset($_POST['submit'])

?>
<!-- *********************** END OF validate.php ***********************
// *********************** START OF index.php ***********************
//  This file will submit the form that leads to the above file  -->
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Document</title>
    <link rel="stylesheet" href="css/main.css">
</head>

<body id="loginwrapper">
    <header>
        <img src="imgs/logo.png" alt="Company Logo">
        <h1>Login To View User Messages</h1>
    </header>

    <?php 
	// This is how the error message will appear
    $error = !empty($_GET['error'])?$_GET['error']:false; // If the $_GET is not empty then set it to what is inputed in the browser else it is false
        switch ($error) {
            case 'wrongpass':
            echo '<h2 class="error">Wrong Password, Please Try Again</h2>';
            break;
            case 'noUser':
            echo '<h2 class="error">There is no user with that account. Please Try Again</h2>';
            break;    
            default:
            break;
        }
    ?>
    <div class="formContainer">
        <form name="myForm" method="post" action="validate.php">

            <div>
                <input type="email" id="email" placeholder="Email" name="strEmail" class="form-input"
                    pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$" title="name@account.com" required />
            </div>
            <div>
                <input type="password" id="password" placeholder="Password" name="strPassword" required>
            </div>

            <input type="submit" name="submit" value="Submit" class="submit" />
            <input type=reset value="Clear Form" class="submit" />
        </form>
    </div>
</body>

</html>
<!-- *********************** END OF index.php *********************** -->
<?php
//*********************************************************************************************************
// CUSTOM CMS SEARCH FEATURE  --> search.php (<form action="search.php" method="post" name="search"></form>)
//*********************************************************************************************************/
// *********************** START OF search.php ***********************

// If the user clicks submit on the search form this following code runs: 
if(isset($_POST['submit']))
{

// setting the words the user typed in the search bar to this variable
$search = $_POST['search'];

// Checking for the posts tags on the posts table that match the search  
$query = "SELECT * FROM posts WHERE post_tags LIKE '%$search%' ";

// connect to the database and run the query
$searchQuery = mysqli_query($connection, $query);

// if for some reason the mysqli_query() fails then the error message displays
if(!$searchQuery){
	echo 'no query';
	die("Failed Query" . mysqli_error($connection));
}
// counting the characters entered in the search bar and matching it with the database
$count = mysqli_num_rows($searchQuery);
// if nothing matches with the info in the database then there aren't any results to show 
if($count == 0) {
	echo "<h1>NO RESULT</h1>";
} else {
	// using the while loop to fetch an associative array from the query, then separating each row and looping over it untill all the data is pulled
	while($row = mysqli_fetch_assoc($searchQuery))
			{
		$post_title = $row['post_title'];
		$post_author = $row['post_author'];
		$post_date = $row['post_date'];
		$post_image = $row['post_image'];
		$post_content = $row['post_content']; 	
		?>
<!-- CLOSING PHP TAG TO DISPLAY 1 SET OF RESULTS IN THE FOLLOWING FORMAT -->
<h1 class="page-header">
    Page Heading
    <small>Secondary Text</small>
</h1>
<!--  Blog Post -->
<h2>
    <a href="#"><?php echo $post_title ?></a>
</h2>
<p class="lead">
    by <a href="index.php"><?php echo $post_author ?></a>
</p>
<p><span class="glyphicon glyphicon-time"></span> <?php echo $post_date ?></p>
<hr>
<img class="img-responsive" src="imgs/<?php echo $post_image; ?>" alt="">
<hr>
<p><?php echo $post_content ?></p>
<a class="btn btn-primary" href="#">Read More <span class="glyphicon glyphicon-chevron-right"></span></a>
<hr>
<!-- MARKS END OF CONTENT THAT WILL BE LOOPED OVER -->
<?php } // Opening the php tag starts the loop again until here
		} // end of else statement
} // end of $_POST['submit]
?>