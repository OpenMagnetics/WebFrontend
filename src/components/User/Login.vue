<script setup>
import { computed, ref, onMounted, inject } from 'vue';
import { Form } from 'vee-validate';
import * as Yup from 'yup';
import TextInput from '/src/components/User/TextInput.vue';

</script>
<script>

export default {
    components: { },
    props: {
        isLogin: {
            type: Boolean,
            default: true,
        },
    },
    data() {
        const usedUsernames = []
        const usedEmails = []
        const formRef = null
        const testref = null
        const passwordRef = null
        const usernameRef = null
        const posting = false
        const done = false
        return {
            usedUsernames,
            usedEmails,
            formRef,
            testref,
            passwordRef,
            usernameRef,
            posting,
            done,
        }
    },
    methods: {
        onSubmit(values) {
            var url
            var data
            if (this.isLogin) {
                url = import.meta.env.VITE_API_ENDPOINT + '/login'
                data = {
                    username: values['loginUsername'],
                    password: values['loginPassword'],
                }
            }
            else {
                url = import.meta.env.VITE_API_ENDPOINT + '/register'
                data = {
                    username: values['registerUsername'],
                    email: values['email'],
                    password: values['registerPassword'],
                }
            }

            this.posting = true

            this.$axios.post(url, data)
            .then(response => {
                if (response.data['status'] == 'username exists'){
                    this.usedUsernames.push(response.data['username'].toLowerCase())
                    this.formRef.validate()
                }
                else if (response.data['status'] == 'email exists'){
                    usedEmails.push(response.data['email'].toLowerCase())
                    this.formRef.validate()
                }
                else if (response.data['status'] == 'registered'){
                    this.done = true
                    this.$cookies.set("username", response.data['username'], "1h")
                    this.$emit("onLoggedIn")
                }
                else if (response.data['status'] == 'wrong password'){
                    this.formRef.setFieldError('loginPassword', "Wrong password. Please try again")
                }
                else if (response.data['status'] == 'unknown username'){
                    this.formRef.setFieldError('loginUsername', "Unknown username")
                }
                else if (response.data['status'] == 'logged in'){
                    this.done = true
                    this.$cookies.set("username", response.data['username'], "1h")
                    this.$emit("onLoggedIn")
                }
                this.posting = false
            })
            .catch(error => {
                this.posting = false
            });
        },
        onInvalidSubmit() {
          const submitBtn = document.querySelector('.submit-btn');
          submitBtn.classList.add('invalid');
          setTimeout(() => {
            submitBtn.classList.remove('invalid');
          }, 1000);
        },
    },
    computed: {
        isRegister() {
            return !this.isLogin
        },

        schema() {
            if (this.isLogin) {
                const loginSchema = Yup.object().shape({
                    loginUsername: Yup.string().required().label("Username"),
                    loginPassword: Yup.string().min(6).required().label("Password"),
                });
                return loginSchema
            }
            else {
                const registerSchema = Yup.object().shape({
                    registerUsername: Yup.lazy(value => { return Yup.string().lowercase().trim().required().notOneOf(this.usedUsernames, 'Username is already in use').label("Username")}),
                    email: Yup.lazy(value => { return Yup.string().email().lowercase().trim().required().notOneOf(this.usedEmails, 'Email is already in use').label("Email")}),
                    registerPassword: Yup.string().min(6).required().label("Password"),
                    confirmPassword: Yup.string().required().oneOf([Yup.ref('registerPassword')], 'Passwords do not match').label("Password"),
                });
                return registerSchema
            }
        }

    },
    created() {
    },
    mounted() {
    }
}

</script>

<template>
    <div class="modal-dialog">
        <div class="modal-content bg-dark text-white">
            <div class="modal-header">
                <h1 class="modal-title fs-5" id="LoginLabel">{{isLogin? "Login" : "Register"}}</h1>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="LoginClose"></button>
            </div>
            <div v-if="!done" class="modal-body">
                <Form ref=formRef @submit="onSubmit" :validation-schema="schema" @invalid-submit="onInvalidSubmit">
                    <TextInput
                        ref="usernameRef"
                        class="text-white bg-dark"
                        :name="isLogin? 'loginUsername' : 'registerUsername'"
                        type="text"
                        label="Username"
                        placeholder="Your Username"
                        :success-message="isLogin? '' : 'Nice to meet you!'"
                    />
                    <TextInput
                        v-if="isRegister"
                        class="text-white bg-dark"
                        name="email"
                        type="email"
                        label="E-mail"
                        placeholder="Your email address"
                        success-message="Got it, we won't spam you!"
                    />
                    <TextInput
                        ref="passwordRef"
                        class="text-white bg-dark"
                        :name="isLogin? 'loginPassword' : 'registerPassword'"
                        type="password"
                        label="Password"
                        placeholder="Your password"
                        :success-message="isLogin? '' : 'Nice and secure!'"
                    />
                    <TextInput
                        v-if="isRegister"
                        class="text-white bg-dark"
                        name="confirmPassword"
                        type="password"
                        label="Confirm Password"
                        placeholder="Type it again"
                        success-message="Glad you remembered it!"
                    />

                    <button v-if="!posting" class="submit-btn btn btn-primary" type="submit">{{isLogin? "Login" : "Register"}}</button>
                    <img v-if="posting" class="mx-auto d-block" alt="loading" style="width: 150px; height: auto;" src="/images/loading.gif">
                </Form>
            </div>
            <div v-if="done" class="modal-body">
                <h1 class="modal-title fs-5 text-center" >{{isLogin? "Welcome back, " + $cookies.get("username") : "Welcome to Open Magnetics!"}}</h1>
                <button class="btn btn-primary mx-auto d-block mt-5" data-bs-dismiss="modal" >{{"Go back"}}</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

html,
body {
  width: 100%;
  height: 100%;
}


form {
  width: 300px;
  margin: 0px auto;
  padding-bottom: 60px;
}

.submit-btn {
  outline: none;
  border: none;
  font-size: 18px;
  padding: 10px 15px;
  display: block;
  width: 100%;
  border-radius: 7px;
  margin-top: 40px;
  transition: transform 0.3s ease-in-out;
  cursor: pointer;
}

.submit-btn.invalid {
  animation: shake 0.5s;
  /* When the animation is finished, start again */
  animation-iteration-count: infinite;
}

@keyframes shake {
  0% {
    transform: translate(1px, 1px);
  }
  10% {
    transform: translate(-1px, -2px);
  }
  20% {
    transform: translate(-3px, 0px);
  }
  30% {
    transform: translate(3px, 2px);
  }
  40% {
    transform: translate(1px, -1px);
  }
  50% {
    transform: translate(-1px, 2px);
  }
  60% {
    transform: translate(-3px, 1px);
  }
  70% {
    transform: translate(3px, 1px);
  }
  80% {
    transform: translate(-1px, -1px);
  }
  90% {
    transform: translate(1px, 2px);
  }
  100% {
    transform: translate(1px, -2px);
  }
}

.submit-btn:hover {
  transform: scale(1.1);
}
</style>
