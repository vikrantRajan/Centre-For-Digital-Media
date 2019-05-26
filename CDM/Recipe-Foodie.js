/*****************************************************************
 * --> RECIPE CONTROLLER (index.js) --> Root of the project
 ***************************************************************** */
const controlRecipe = async () => {
  // getting the hash id from the url
  const id = window.location.hash.replace("#", ""); // removing the # from the url, replaced with ''
  if (id) {
    // Prepare UI for changes
    recipeView.clearRecipe(); // clearing HTML on the recipe details section
    renderLoader(elements.recipe); // placing the spinning loader to show data is being fetched
    if (state.search) {
      searchView.highlightSelected(id); // Highlight selected recipe in the search bar
    }
    state.recipe = new Recipe(id); // Create new recipe object
    // if the axios ajax call is successful
    try {
      await state.recipe.getRecipe(); // recipe data from Promise that happens with async function eventually gets the resolved data
      state.recipe.parseIngredients(); // formating the ingredients in a uniform measure
      state.recipe.calcTime(); // Calculate time and servings per recipe
      state.recipe.calcServings();
    } catch (err) {
      console.log(err); // incase the data cannot be retrieved from server
      alert("Error processing recipe");
    }

    clearLoader(); // clearing the spinning loader
    recipeView.renderRecipe(state.recipe, state.likes.isLiked(id)); // Show recipe on HTML along with likes (if applicable to returning user)
  }
};
// event delegation --> to run the controlRecipe upon the changed ID, which will display the spinning loader as the data is fetched
// saved the two events in a array[destructuring] then looped over them (instead of repeating the addEventListener)
["hashchange", "load"].forEach(event =>
  window.addEventListener(event, controlRecipe)
);
/***********************************************************************
 * -------> RECIPE MODEL (models/Recipe.js) --> inside the models folder
 *********************************************************************** */
// using axios http request libarary instead of fetch to avoid issues with browsers also it automatically converts files to JSON in one step
import axios from "axios"; //
import { key, proxy } from "../config";
export default class Recipe {
  // Each recipe is assigned an ID from the API
  constructor(id) {
    this.id = id;
  }
  async getRecipe() {
    try {
      // this axios/AJAX call will return a Promise which the async function will wait for
      const res = await axios(
        `https://www.food2fork.com/api/get?key=${key}&rId=${this.id}`
      );
      this.title = res.data.recipe.title;
      this.author = res.data.recipe.publisher;
      this.image = res.data.recipe.image_url;
      this.url = res.data.recipe.source_url;
      this.ingredients = res.data.recipe.ingredients;
      console.log(res);
    } catch (error) {
      console.log(error);
      alert("Something went wrong :(");
    }
  }
  calcTime() {
    // Assuming that we need 15 min for 3 ingredients
    const numIng = this.ingredients.length; // get total number of ingredients
    const periods = Math.ceil(numIng / 3); // returns an integer
    this.time = periods * 15;
  }
  calcServings() {
    this.servings = 4;
  }
  /**
   * We need to format the ingredients because it does not come in a standard format. Some descriptions have uppercase, some lower, some with paranthesis, some as fractions with a '-' inbetween. etc.
   */
  // converting ingredients list from API into a single standard of measurement
  parseIngredients() {
    const unitsLong = [
      "tablespoons",
      "tablespoon",
      "ounces",
      "ounce",
      "teaspoons",
      "teaspoon",
      "cups",
      "pounds"
    ];
    const unitsShort = [
      "tbsp",
      "tbsp",
      "oz",
      "oz",
      "tsp",
      "tsp",
      "cup",
      "pound"
    ];
    const units = [...unitsShort, "kg", "g"];
    // using the array.map() to loop over all ingredients(el)
    const newIngredients = this.ingredients.map(el => {
      // 1. Uniform units of measurement
      let ingredient = el.toLowerCase(); // all lowercase letters
      unitsLong.forEach((unit, i) => {
        ingredient = ingredient.replace(unit, unitsShort[i]); // replacing API's measurement with new ones defined
      });
      // 2. Remove paranthesis from ingredient with regex - eg. some recipes lists have (cups)
      ingredient = ingredient.replace(/ *\([^)]*\) */g, " ");
      // 3. Parse ingredients into count, unit and ingredient
      const arrIng = ingredient.split(" "); // splitting each element of the ingredients(count, unit & ingredient)
      const unitIndex = arrIng.findIndex(el2 => units.includes(el2)); // Each ingrdient displays in a different way (with/without units, with/without number etc) || Find the index where the measurement unit is located(findIndex) || each element is tested if it included in the unitsShort array. ALlows us to find the position of the unit
      let objIng; // final formatted ingredient object that will be returned.
      if (unitIndex > -1) {
        // if units are included in the array above then this happens:
        const arrCount = arrIng.slice(0, unitIndex); // eg. 4 1/2 , arrCount = [4, 1/2]
        let count; // storing total quantity measurements here
        if (arrCount.length === 1) {
          count = eval(arrIng[0].replace("-", "+")); // some recipes are written '1-1/2 cups..' which can be taken as a math operator. string will be evaluated to return the correct number --> 1.5 cups
        } else {
          // array of ingredients sliced from begining until unitIndex. Joining the ingredients with +. Then evaluate the strings that does the math for eg. eval("4+1/2") --> 4.5
          count = eval(arrIng.slice(0, unitIndex).join("+")); // slice it and start at position 0, putting strings back together with join
        }
        objIng = {
          count,
          unit: arrIng[unitIndex],
          ingredient: arrIng.slice(unitIndex + 1).join(" ")
        };
      } else if (parseInt(arrIng[0], 10)) {
        // If there is no unit but there is text. 1st element of measure is a number || if it is possible to return first element of array as a number it will return true. else NaN/false
        objIng = {
          count: parseInt(arrIng[0], 10),
          unit: "",
          ingredient: arrIng.slice(1).join(" ") // slice it and start at position one, putting it back together with join
        };
      } else if (unitIndex === -1) {
        // If there is NO unit or NO number in the 1st position. eg. just 'tomato'
        objIng = {
          count: 1,
          unit: "",
          ingredient
        };
      }
      return objIng;
    });
    this.ingredients = newIngredients;
  }

  updateServings(type) {
    // Servings || if its decreasing then reduce servings number
    const newServings = type === "dec" ? this.servings - 1 : this.servings + 1;
    // Ingredients || foreach ingredient we have to change the count based on the number of servings the user chooses
    this.ingredients.forEach(ing => {
      ing.count *= newServings / this.servings;
    });
    this.servings = newServings;
  }
}
/**************************************************************************************
 * -------> RECIPE VIEWS (views/recipeViews.js) ---> inside the views folder
 ************************************************************************************** */
// importing DOM elements from base.js
import { elements } from "./base";
// using the fractional framework to convert decimals to fractions
import { Fractional } from "fractional";
export const clearRecipe = () => {
  elements.recipe.innerHTML = "";
};
//
const formatCount = count => {
  if (count) {
    // count = 2.5 --> 2 1/2 || count = 0.5 --> 1/2
    // getting the integer & decimal | conversion to string | splitting each number at the . | looping over all elements to convert it back to numbers
    const [int, dec] = count
      .toString()
      .split(".")
      .map(el => parseInt(el, 10));
    // if there is no decimal then nothing changes (2 cups...)
    if (!dec) return count;
    // if the integer = 0 but there is a decimal (0.5 cups...)
    if (int === 0) {
      const fr = new Fraction(count); // based on the count it will give us numerator & denominator
      return `${fr.numerator}/${fr.denominator}`;
    } else {
      const fr = new Fraction(count - int); // even if its 2.5 Cups...we only need to create a fraction of just 0.5 and add it to 2.
      return `${int} ${fr.numerator}/${fr.denominator}`;
    }
  }
  return "?";
};
const createIngredient = ingredient => `
    <li class="recipe__item">
        <svg class="recipe__icon">
            <use href="img/icons.svg#icon-check"></use>
        </svg>
        <div class="recipe__count">${formatCount(ingredient.count)}</div>
        <div class="recipe__ingredient">
            <span class="recipe__unit">${ingredient.unit}</span>
            ${ingredient.ingredient}
        </div>
    </li>`;
export const renderRecipe = (recipe, isLiked) => {
  const markup = `
<figure class="recipe__fig">
    <img src="${recipe.image}" alt="${recipe.title}" class="recipe__img">
    <h1 class="recipe__title">
        <span>${recipe.title}</span>
    </h1>
</figure>

<div class="recipe__details">
    <div class="recipe__info">
        <svg class="recipe__info-icon">
            <use href="img/icons.svg#icon-stopwatch"></use>
        </svg>
        <span class="recipe__info-data recipe__info-data--minutes">${
          recipe.time
        }</span>
        <span class="recipe__info-text"> minutes</span>
    </div>
    <div class="recipe__info">
        <svg class="recipe__info-icon">
            <use href="img/icons.svg#icon-man"></use>
        </svg>
        <span class="recipe__info-data recipe__info-data--people">${
          recipe.servings
        }</span>
        <span class="recipe__info-text"> servings</span>

        <div class="recipe__info-buttons">
            <button class="btn-tiny btn-decrease">
                <svg>
                    <use href="img/icons.svg#icon-circle-with-minus"></use>
                </svg>
            </button>
            <button class="btn-tiny btn-increase">
                <svg>
                    <use href="img/icons.svg#icon-circle-with-plus"></use>
                </svg>
            </button>
        </div>

    </div>
    <button class="recipe__love">
        <svg class="header__likes">
            <use href="img/icons.svg#icon-heart${
              isLiked ? "" : "-outlined"
            }"></use>
        </svg>
    </button>
</div>
<div class="recipe__ingredients">
    <ul class="recipe__ingredient-list">
        ${recipe.ingredients.map(el => createIngredient(el)).join("")}
    </ul>

    <button class="btn-small recipe__btn recipe__btn--add">
        <svg class="search__icon">
            <use href="img/icons.svg#icon-shopping-cart"></use>
        </svg>
        <span>Add to shopping list</span>
    </button>
</div>

<div class="recipe__directions">
    <h2 class="heading-2">How to cook it</h2>
    <p class="recipe__directions-text">
        This recipe was carefully designed and tested by
        <span class="recipe__by">${
          recipe.author
        }</span>. Please check out directions at their website.
    </p>
    <a class="btn-small recipe__btn" href="${recipe.url}" target="_blank">
        <span>Directions</span>
        <svg class="search__icon">
            <use href="img/icons.svg#icon-triangle-right"></use>
        </svg>

    </a>
</div>
    `;
  elements.recipe.insertAdjacentHTML("afterbegin", markup);
};

export const updateServingsIngredients = recipe => {
  // Update the servings on DOM
  document.querySelector(".recipe__info-data--people").textContent =
    recipe.servings;
  // update the ingredients on DOM
  const countElements = Array.from(document.querySelectorAll(".recipe__count"));
  countElements.forEach((el, i) => {
    // formating the ingredients units/measuerments
    el.textContent = formatCount(recipe.ingredients[i].count);
  });
};
