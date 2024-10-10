# Form Architecture

Forms are a complex user experience to build and get right. There are a lot of small edge cases which can produce frustration for users. Additionally, creating a positive developer experience for forms can be challenging. There should be many primitives and utilities to aid in both the developer and user experience by allowing for less code to be written while producing a positive experience for both users and developers.

## Architecture Philosophies

Forms should follow a consistent implementation and user experience. There are multiple aspects that contribute to this goal:

### Good Primitives

Primitives are the lowest level building blocks for any software. Programming languages provide the lowest level primitives that represent data types an application will work with like strings, numbers, collections, concurrency, etc. However these are usually generic and applicable to any application. An application can build its own primitives on top of these language primitives that are tailored to the domain of the application. A "good primitive" has a name that provides some degree of clarity on its purpose at a glance, has a thoughtfully isolated focus (i.e. "do one thing and do it well"), reduces the amount of code written where consumed without added complexity, and is designed to work well with other primitives in the application (i.e. composable).

It is very common in JavaScript applications to inline many small things and be averse to creating small functions and utilities. Other times, it's better opportunities to name small bits of functionality is encouraged, whether it is a shared utility or a private one for use in the current file. Doing this enables the code to tell you what it is doing in-context. For example, it is quicker to understand `isEmpty(users)` than `users.length === 0` to mean that it is checking if there are no users in the `users` variable.

### Do One Thing and Do It Well

This is taken from the [Unix Philosophy](https://en.wikipedia.org/wiki/Unix_philosophy) and goes deeper on "a thoughtfully isolated focus" mentioned above in what makes a "good primitive." It applies to all levels of abstraction from the lower level primitives and utility functions to the bigger UI components and helps promote code reuse, ease of testing, and ease of composition. It involves knowing where to establish boundaries for your code abstractions, or put another way, what should each piece of code be responsible for and what should it NOT be responsible for. This sense is developed through experience. This helps prevent writing code that becomes large and complicated because it is trying to do too much. Breaking out pieces of functionality from monolithic modules can simplify the resulting code.

### Favor Pure Functions

[Pure functions](https://en.wikipedia.org/wiki/Pure_function) are often easy to reason about, have predictable outcomes, and are easy to test. They are most often functions that transform data or derive meaning from data. The majority of our low-level utility code and low-level components should be pure. [Side effects](<https://en.wikipedia.org/wiki/Side_effect_(computer_science)>) should not be written into pure functions and can instead be called with the results of pure functions. This often happens in the main algorithms or UI interaction handler code.

### Favor Declarative Interfaces

JavaScript provides an incredibly powerful language feature: First Class Functions. This means that functions can be stored in variables and passed around the same as strings, numbers, objects, and any other data. This enables the ability to create templated functionality. For a simple example of this, if you wanted to get a filtered subset of an array, a non-declarative approach would be:

```js
const users = [...];
const staleUsers = [];
for (let index = 0; index < users.length; index++) {
    if (users[index].lastLogin < new Date('3 week ago')) {
        filtered.push(users[index]);
    }
}
```

This includes a lot of boilerplate for iterating over the array that would need to be duplicated anytime you wanted to get a subset of an array. But because JavaScript supports First Class Functions, we can make this a more declarative approach which allows for self-descriptive code:

```js
const users = [...];
const hasNotLoggedInForAWhile = user => user.lastLogin < new Date('3 weeks ago');
const staleUsers = users.filter(hasNotLoggedInForAWhile);
```

We have the array of users to filter, we have a descriptively named function that tells us what it is trying to do, and the operation that produces the filtered list of users is also self-descriptive ("filter the users for ones that have not logged in for a while").

Utilizing this means that you can create utilities and components where you can pass in small functions that customize embedded functionality like data validation, data transformation, analytics triggering, and more. And with default arguments like `const alwaysTrue = () => true;` for data validation, `const identity = x => x;` for data transformation, and `const noop = () => {};` for analytics triggering, it is easy to make them optional.

For components, this can look like defining function props aside from `on*` lifecycle props that are tied into internal lifecycle and allow you to customize what happens at certain points internally. For example, the modernized form field components provide a `validate` prop which takes a `Validator` function (explained below) to define the expectations for the field value to be called internally at the appropriate times instead of requiring the developer to manually wire up when the validation happens for each field component. The validation for the field is templated and the developer only needs to provide the code to perform the validation. The component takes care of the rest.

## Form Architecture Patterns

You can build forms to focus mainly on the fields and field data for the specific form, validation of that data, displaying validation errors, tracking notable interactions with forms like when the form has been submitted at least once, and providing hooks for the parent/consuming component to monitor the lifecycle of the form. Forms should have no opinion on what happens to the form data after form submission. That is the responsibility of the business logic defined in parent components.

Some notable details about my reference service's form designs:

- Form fields are validated (if a validator is provided) on each keystroke. Any validation errors are hidden until certain interactions happen (listed below). The form field components handle this internally, store the validation results, and broadcast them up through the `onValidityChange` prop. The error showing logic can be customized via props.
- By default, form fields should normally show their inline errors under 2 circumstances:
  1. The field has received and lost focus at least once and the field value have been changed at least once. This is referred to as the field being "touched"
  2. When the form has been submitted at least once regardless of whether or not any fields have been touched. For example, if a form is immediately submitted without any fields being touched, all fields that are invalid should show their inline errors.
- The form field components are designed to hide away the details of being [controlled components](https://reactjs.org/docs/forms.html#controlled-components) so the Form doesn't need to manually manage the values of all of its fields. This was done to remove the boilerplate code needed for field state management and to reduce the impact of state updates causing re-renders. However, this is not fully implemented. In the meantime, the value for each field should be maintained in a state hook (`useObjectState()` is recommended). In the future, the field data will be exposed by the `<Form onDataSubmit>` callback prop. The parent component around the custom Form should not need to be aware of the form's state until submission in most cases.
- Form field components support declarative validation with the `validate` prop. This prop accepts a `Validator` type function (explained later) and will validate the field's data internally and broadcast the results upward.

### Form Data

The Form data is maintained in a custom state hook specialized for objects. In the future this will be unnecessary. Unlike in most common React form designs, there is no cyclic updating of the field `value` prop like with Controlled Components. That has been isolated inside the custom form field components. Because of this, the form field components only provide a `defaultValue` prop for the initial field value and no `value` prop. If you need to programmatically update the field value, use the field's `setFieldValue()` Component API function (explained later).

### Form Data Validation

Form data validation is done declaratively with `Validator` functions. A `Validator` function is a function that takes a value of any type and returns an array with zero or more validation failure reasons. An empty array means the value meets all of the validation criteria. These are intentionally written to accumulate all the failure reasons rather than stopping at the first failure and then the consuming code chooses what to do with the data. The fundamental type is `<Reason = string>(value: unknown) => Reason[];`. This type is based on the common form data validation pattern:

```js
const validateSomeField = value => {
  const errors = [];

  if (!isSomeCriteria(value)) {
    errors.push('The value did not meet some criteria.');
  }

  if (!isSomeOtherCriteria(value)) {
    errors.push('The value did not meet some other criteria.');
  }

  // ... and so on

  return errors;
};
```

The order in which the individual checks are defined is significant and form fields typically display the first failure.

The utilities and types related to `Validator` functions lives in `src/utils/validation`. At a high level, they are:

#### Types

The fundamental definition of a `Validator` function yields a very simple but flexible tool, notably in the data that defines a validation failure reason. The failure reason can be as simple as a string message or a richer data structure like an object with a string message and additional metadata. This implementation can define a `ValidationFailure` type with associated constructor that is a 3-key object which is used as the standard validation failure reason:

```ts
// type PlainObject = Record<string, any>

type ValidationFailure<R = string, M extends PlainObject = PlainObject> = {
  /**
   * The reason data for the failure. Usually a string message that can contain placeholders to be replaced before
   * displaying.
   */
  reason: R;
  /**
   * An `Error` or `Error` subclass if the Predicate function threw an error which should be nearly impossible in
   * TypeScript. If an error is thrown, it should be considered a failure.
   */
  error: null | Error;
  /**
   * Any metadata to associate with the failure to be used in the final rendering. This could be the name of the data,
   * like when validating an object. Form validation includes `field` for the data field, `label` for the field label
   * for templated failure messages, and an optional `validationId` field used with the `<FieldLiveValidationErrors>`
   * component.
   */
  meta: M;
};
```

And the `Validator` type definition is:

```ts
// type PlainObject = Record<string, any>

// NOTE The `T` param needs to be updated to `unknown`
// NOTE The return type actually used is an alias for `ValidationFailure<R, M>[]` but it has been de-aliased for brevity
type Validator<T = any, R = string, M extends PlainObject = PlainObject> = (data: T) => ValidationFailure<R, M>[];
```

It is intended for the `ValidationFailure` to be used as a data model for anything related to displaying invalid data messages. All form field component that work with field error messages should accept the specialized `FormFieldValidationFailure` or `FormFieldValidationResults` types.

#### `noopValidator()`

This `Validator` function always returns empty array, signaling a valid value. It is used as the default value for props and function args that accept an option `Validator` which means the validation passes by default. You will usually need to coerce its type with an `as <Type>` suffix to get its type to align.

#### `createValidator()`

This utility is a `Validator` factory that templatizes the example `Validator` function from above. It's most simple usage takes an array of "rule" tuples where the first entry is a `Predicate` function (like the `isSomeCriteria` and `isSomeOtherCriteria` functions from above) and a failure reason (usually a string message to display) and returns a `Validator` function. Internally it iterates through all the rules and accumulates all the failure reasons where the `Predicate` returned `false`. `Validator` functions can be created without this, but it removes a lot of the boilerplate. See the function documentation to see what else it can do.

#### `composeValidators()`

This utility takes any number of `Validator` functions and returns a `Validator` function that calls each one provided and returns the combined array of validation result failures. This can be useful for code that has always-present validation defined but can also accept custom validation.

#### `combineValidators()`

This utility creates a `Validator` function for validating object data, like the total data of a form. It takes an object where each key has a `Validator` function defined. The resulting `Validator` function takes an object to validate and will run each defined `Validator` against the corresponding key of that object and return an array (not an object) with the validation failure reasons. Each reason has the object key provided at `meta.field` so that each failure reason has a reference to the object field that failed. It is modeled after Redux's `combineReducers()` to combine `Validator`s in a declarative way to work on an object value.

Additionally, each `Validator` defined is attached to the returned `Validator` function so that you have access to each field `Validator`.

#### Caveats

The `required` prop on `InputField`, `PhoneField`, `DateField`, and `DropdownField` do not apply validation. It only applies a11y attributes to the resulting code. You will need to use `isFieldRequired` in your `Validator` at this time for required fields. This is planned to be fixed.

`PhoneField` and `DateField` offer autoformatting (aka Input Mask) to enforce a specific format for the field value. However incomplete field values are not automatically validated at this time so you will need to use `isPhoneValid` and `isCompleteDateFieldValue` respectively in your `Validator`s for these fields to validate the completeness of the field value at this time. This is planned to be fixed.

In some cases, you need to compare the values of multiple fields for validation. Examples of this in our codebase are: the Email and Confirm Email or Password and Confirm Password fields where the values in the pair of fields needs to match; and editing Security Questions where there are restrictions on using the same answer for multiple questions and reusing part of the question in the answer. The former uses an old solution in `BasicAccountFields` which should not be copied. The latter uses the currently preferred solution where you use `combineValidators` to define the individual field validations, then a manually defined `Validator` function that accepts the whole form data and does the validations that compare multiple fields, and then use `composeValidators` to combine them. There is a shortcoming in this because the field validators are attached to the result of `combineValidators()` and the result of `composeValidators()` doesn't expose those so you will need to hold onto a reference of the `combineValidators()` result to provide the field `Validator`s to each field and then used the composed one to validate the whole form. This is planned to be improved.

### Component API

Instead of using controlled components and prop-driven API to change certain aspects of child components, we can use an idea called Component APIs where components can define a set of functions that can be provided to parent components. You can think of a Component API object like a component Ref but with an explicitly defined set of functionality instead of having raw access to the component itself. Component APIs have a similar lifecycle as component Refs where they are not available until after the component has mounted and they are cleaned up when the component unmounts.

For example, normally when you want to programmatically focus on an element, you have to call the `.focus()` method on the element Ref. But if you want to do consistently do additional functionality when focusing on that kind of element, you have to copy/paste that added functionality in the correct order everywhere you want to programmatically focus on the element. Plus you get access to _EVERY_ other property and method on the element or component. Component API allows you to define a custom `.focus()` function that can focus on the element AND consistently do additional functionality when called. This pattern is modeled after the idea of public APIs. An example of this is the `setFieldValue()` Component API function on modern form field components. Instead of setting the field value with the `value` prop, you call the `setFieldValue()` function which will internally update the field's value AND trigger the field's `onChange` and `onValueChange` handlers.

Forms and Form Field components will often have Component APIs defined.

### Custom Form Component event props

The baseline HTML elements for forms define solid low-level event handlers: `onSubmit` for `<form>` and `onChange` for `<input>`, `<select>` and `<textarea>`. Using these as they are requires a lot of additional boilerplate. The forms and field components define improved event callbacks on top of these baseline ones. These improved event handlers should be used and are defined in the `BaseFormProps` and `BaseFormFieldProps` types in `src/UI/Form/types.ts`.

#### `<Form>`

- `onDataSubmit` receives 3 arguments: the validation results of the form data at the submission, the form data itself, and the form submission event that `onSubmit` receives. At the point this is called, all form fields will be updated with any inline errors to display. It is up to the parent component to define what to do with the information provided. Note that the Form component does nothing to block a submission with validation failures from proceeding.
- `onFormChange` receives 2 arguments: the current state of the form data and a boolean `true` for the first form render and `false` for all subsequent renders. This is meant to be a form-level `onChange` handler in case the parent component needs awareness of any of the form data while it is being edited. It is only called when the form data changes.
- `onFormValidityChange` receives 1 argument: the validation results of the current state of the whole form data. It is only called during form submission and only when the validation results change from the previous submission.

#### Form Fields

- `onChange` is a pass through of the low-level `onChange` handler and receives 1 argument: the change event object. This may be removed eventually and shouldn't be relied upon, especially since the event object is also provided to `onValueChange`. This is triggered whenever the field value changes, including when the `setFieldValue()` Component API function is called, and when the component first renders if the data is invalid.
- `onValueChange` receives 3 arguments: the updated field value, the field's `name` prop, and the change event object from the low-level on `onChange` event. Most often, you only need the updated value so that's why it comes first (you could pass the state setter function from `useState` directly to `onValueChange` but we don't usually do that). This function signature makes it so that you can define one handler to work on all form fields because it receives both the value and field name to update the form state. It is triggered whenever the field value changes, including when the `setFieldValue()` Component API function is called, and when the component first renders if the data is invalid.
- `onValidityChange` receives 1 argument: the validation results against the updated field value. It is potentially called every time the field value changes (including by `setFieldValue()` Component API function) but only when the validation results are different than the previous call. For example, if a field has the 2 validation rules required and matching a format of 5 numbers like a Zip Code, `onValidityChange` will be called once when that field changes from empty to 1 character (required rule has been satisfied but format rule hasn't yet), and as the user enters the digits 2, 3, and 4, it will not be called because the format validation rule has not be satisfied yet. Once the user enters the last digit, `onValidityChange` will be called again because the format rule has changed from invalid to valid. It can also be called when the form field's Component API function to set the field value is called.

Currently, `onFocus` and `onBlur` are exposed as well, but other event handlers haven't been necessary so they haven't been added. If you need them, you can add them.

## Form Component Template

You can find some exemplar Form components in the codebase that implement this pattern and some more complex cases: `BaseAccountFields`, `EditPhoneForm`, `EditSecurityQuestionForm`, and `UserNameAccountForm`

Forms can follow a base template to define everything. If you use this template, you can delete the majority of the comments. Some Forms may need more but this is the most common pieces:

```ts
/**
 * The object type definition for all the data captured in the form. This may be defined in a separate file to be reused
 * in other places.
 */
type MyFormData = {...};

/**
 * Content bindings for the `withContent()` HOC
 */
const mapContentToProps = {...};
type MyFormContentProps = WithContentProps<typeof mapContentToProps>;

type MyFormContentProps = BaseFormProps<MyFormData> &
    EmptyComponent & {
        // Additional props for this form. `BaseFormProps` defines a set of standard props for any Form.
    };

/**
 * Combine the content props and public props to create the total props for this component.
 */
export type MyFormProps = MyFormPublicProps & MyFormContentProps;

/**
 * The Form's component API if supported
 */
export type MyFormApi = {
    setFormErrors: (errors: string[]) => void;
    submitCompleted: () => void;
};

const MyForm: FC<MyFormProps> => ({
    // `BaseFormProps`
    onDataSubmit,
    onFormChange = noop,
    onFormValidityChange = noop,
    api: setApi,

}) => {
    const [formValues, { setField: setFieldValue }] = useObjectState<MyFormData>({
        // The initial values of each form field. All keys defined in the form data type should be present, usually
        // defaulting to empty string or `false` depending on the field data.
    });

    /**
     * Store the Form's validation results. This is currently in a transitional state because most of the newer Form-
     * related code uses the specialized `ValidationResults` type but the red box error still uses a legacy format. The
     * `setFormErrors` defined should be used internally to set the Form errors with the eventual plan to remove that
     * wrapper function while still accepting the same argument (future planning public API for the win!).
     */
    // TODO unify this form error state once <FormErrorsSummary /> can accept raw FormFieldValidationResults
    // NOTE Use the custom `setFormErrors` for now since it will set the split state correctly. We need the form errors
    // to be referentially stable to work with the self-focusing behavior of <FormErrorsSummary />.
    const [formErrors, privateSetFormErrors] = useState<{
        /**
         * `FormFieldValidationResults` is the specialized `ValidationResults` type for Forms
         */
        raw: FormFieldValidationResults;
        /**
         * `summary` handles the legacy red box form error data structure and will eventually be removed
         */
        summary: FormErrorsSummaryData | null;
    }>({
        raw: [],
        summary: null,
    });
    const setFormErrors = (errors: FormFieldValidationResults) => {
        privateSetFormErrors({
            raw: errors,
            summary: errors.length > 0 ? convertValidationResultsToFormErrorsSummaryData(errors) : null,
        });
    };

    /**
     * Other standard Form state:
     * - `formApi` provides the component APIs for the form field components
     * - `isSubmitting` is a flag that signals whether the Form is currently processing a submission. Most commonly this
     *   puts the Submit button into an unclickable "processing" UI state.
     * - 'wasSubmitted` is permanently set to `true` after the Form was submitted the first time. This is used as part
     *   of form field error display since field errors should always display after the form was submitted.
     * - `hasFormRenderedOnce` is a ref so that it doesn't trigger a re-render and works with the `onFormChange`
     *   function prop to signal to parent code whether it was called on the first render or not
     */
    const [formApi, setFormApi] = useComponentApi<Record<keyof MyFormData, InputFieldApi>>();
    const [isSubmitting, { on: startFormSubmit, off: finishFormSubmit }] = useToggleState(false);
    const [wasSubmitted, { on: formWasSubmitted }] = useToggleState(false);
    const hasFormRenderedOnce = useRef(false);

    /**
     * Define the Form Validator.
     *
     * Because many of the field error messages have a placeholder for the field label, it is
     * common to define one or more utility functions to reduce boilerplate in producing those final messages.
     *
     * The Form Validator should be defined with `combineValidators()`. At this time, you need to provide all the
     * additional type data but this will be improved upon in the future.
     */
    // Utilities for generating field error messages
    const getRequiredFieldErrorMessage = (fieldLabel: string) =>
        format(requiredFieldErrorTemplate, { FIELD_NAME: fieldLabel });

    // The form validator function
    const validateForm = combineValidators<MyFormData, string, { label: string; validationId?: string }>({
        field1: createValidator(
            [
                /**
                 * The field labels come from the content pack
                 */
                [isRequiredField, getRequiredFieldErrorMessage(field1Label)],
                // ...
            ],
            {
                /**
                 * The `label` needs to be included manually for each field
                 */
                meta: { label: field1Label },
            }
        ),
        // ... Additional fields
    });

    /**
     * Define the Form's component API for parent components to use. `setApi` is
     */
    useComponentApiDef<MyFormApi>(
        {
            // API functions
        },
        setApi,
        'form'
    );

    /**
     * Define the various callback handlers for the components in this component
     * - `handleValueChange` is for `onValueChange` for each form field component that supports it, which will be all of
     *   them once we have time to flesh out the missing ones. This definition can be used for every conforming field.
     *   For non-conforming field components, you will need to define additional `handle*Change` handlers.
     * - `handleSubmit` is for the `<Form onSubmit>` prop. It's typical order of operations is:
     *   - Signals the commencement of processing the form submission with `startFormSubmit()`.
     *   - Validate the form data from the state hook, signal the parent component if the validation results are
     *     different than the last submission with the `onFormValidityChange` prop, and store the validation results to
     *     compare to the results the next time the form is submitted.
     *   - Signal the form has been submitted at least once with `formWasSubmitted()`
     *   - Group the validation results by field, loop through them by field, and set the field error state for invalid
     *     fields.
     *   - Signal submission to the parent component with `onDataSubmit` prop. The `onSubmit` prop is deprecated but
     *     still called for compatibility.
     *   - Prevent default submission.
     */
    const handleValueChange: ValueChangeEventHandler<HTMLInputElement> = (fieldValue, fieldName) => {
        setFieldValue(fieldName as keyof MyFormData, fieldValue);
    };

    const handleSubmit: FormEventHandler<HTMLFormElement> = ev => {
        startFormSubmit();
        const validationResults = validateForm(formValues);
        if (!deepEqual(formErrors.raw, validationResults)) {
            onFormValidityChange(validationResults);
        }
        setFormErrors(validationResults);
        formWasSubmitted();

        const groupedFailures = groupBy(validationResults, ({ meta: { field } }) => field);
        Object.entries(groupedFailures).forEach(([field, failures]) => {
            const fieldApi = formApi[field as keyof  MyFormData];
            if (fieldApi) {
                fieldApi.setFieldErrors(failures);
            }
        });

        onDataSubmit(validationResults, formValues, ev);
        ev.preventDefault();
    };

    /**
     * Call `onFormChange()` on each render if the form data has changed
     */
    useEffect(() => {
        onFormChange(formValues, !hasFormRenderedOnce.current);
        hasFormRenderedOnce.current = true;
    }, [formValues, onFormChange]);

    return (
        <Form id={QaIds.MY_FORM_ID} onSubmit={handleSubmit}>
            <FormContainer removeTopBottomSpacing>
                {formErrors.summary ? (
                    <FormErrorsSummary id={QaIds.REG_BASIC_ACCOUNT_FORM_SUMMARY_ERROR} error={formErrors.summary} />
                ) : null}

                <InputField
                    name="field1"
                    label={field1Label}
                    type="text"
                    required
                    wasFormSubmitted={wasSubmitted}
                    validate={validateForm.field1}
                    onValueChange={handleValueChange}
                    api={setFormApi}
                />

                {/* Additional fields */}

                <FormActions>
                    <SubmitButton loading={isSubmitting}>{submitButtonLabel}</SubmitButton>
                </FormActions>
            </FormContainer>
        </Form>
    );
}

/**
 * Export the unconnected component as a named export for testing and Storybook and the connected component as the
 * default export with the still-needed explicit type with the content props explicitly omitted until `compose` and the
 * HOCs are updated to automatically modify the component type.
 */
export { MyForm };
export default compose(withContent(mapContentToProps))(MyForm) as FC<
    Omit<MyFormProps, keyof MyFormContentProps>
>;
```