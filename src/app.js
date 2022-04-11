App = {
    loading: false,
    contracts: {},
    questions: 0,
    proposals: [],

    load: async () => {
        await App.loadWeb3()
        await App.loadAccount()
        await App.loadContract()
        await App.render()
        web3.eth.defaultAccount = web3.eth.accounts[0]
    },
    // https://medium.com/metamask/https-medium-com-metamask-breaking-change-injecting-web3-7722797916a8
    loadWeb3: async () => {
        if (typeof web3 !== 'undefined') {
            App.web3Provider = web3.currentProvider
            web3 = new Web3(web3.currentProvider)
        } else {
            window.alert("Please connect to Metamask.")
        }
        // Modern dapp browsers...
        if (window.ethereum) {
            window.web3 = new Web3(ethereum)
            try {
                // Request account access if needed
                await ethereum.enable()
                // Acccounts now exposed
                web3.eth.sendTransaction({/* ... */ })
            } catch (error) {
                // User denied account access...
            }
        }
        // Legacy dapp browsers...
        else if (window.web3) {
            App.web3Provider = web3.currentProvider
            window.web3 = new Web3(web3.currentProvider)
            // Acccounts always exposed
            web3.eth.sendTransaction({/* ... */ })
        }
        // Non-dapp browsers...
        else {
            console.log('Non-Ethereum browser detected. You should consider trying MetaMask!')
        }
    },

    loadAccount: async () => {
        App.account = web3.eth.accounts[0]
    },

    loadContract: async () => {
        const todoList = await $.getJSON('TodoList.json')
        App.contracts.TodoList = TruffleContract(todoList)
        App.contracts.TodoList.setProvider(App.web3Provider)
        
        App.todoList = await App.contracts.TodoList.deployed()

        const voting = await $.getJSON('Voting.json')
        App.contracts.Voting = TruffleContract(voting)
        App.contracts.Voting.setProvider(App.web3Provider)
        
        App.voting = await App.contracts.Voting.deployed()

    },

    render: async () => {
        // Prevent double render
        if (App.loading) {
            return
        }

        // Update app loading state
        App.setLoading(true)

        // Render Account
        $('#account').html(App.account)

        // Render Tasks
        // await App.renderTasks()
        await App.renderVotes()

        App.setLoading(false)
    },

    createTask: async () => {
        App.setLoading(true)
        const content = $('#newTask').val()
        await App.todoList.createTask(content)
        window.location.reload()
    },

    toggleCompleted: async (e) => {
        App.setLoading(true)
        const taskId = e.target.name
        await App.todoList.toggleCompleted(taskId)
        window.location.reload()
    },

    renderVotes: async () => {
        const isChairperson = await App.voting.isChairperson()
        const voteStarted = await App.voting.hasVoteStarted()
        const voteEnded = await App.voting.hasVoteEnded()
        console.log('IsChairperson', isChairperson)
        console.log('voteStarted', voteStarted)
        console.log('voteEnded',voteEnded)
        
        body = document.getElementById('content')
        // conditional rendering based on user type and vote status
        if(isChairperson){
            if(voteEnded){
                try{
                    App.displayResults()
                }
                catch(e){
                    console.log(e)
                }
            }
            else if(voteStarted){
                try{
                    App.displayStopVote()
                }
                catch(e){
                    console.log(e)
                }
            }
            else{
                // create a vote
                App.createVote()
            }
        }
        else{
            if(voteStarted){
                // TODO vote code
            }
            else if(voteEnded){
                App.displayResults()
            }
            else{
                let p = document.createElement('p')
                p.innerHTML = 'Voting has not yet started'
            }
        }
    },

    displayResults: async() =>{
        const body = document.getElementById('content')
        questions = []
        proposals = []
        votes = []
        
        try{
            const q = (await App.voting.getQuestions()).toString().split('\n')
            const ans = (await App.voting.getResults()).toString().split('\n')
        
            for(let i = 0; i < q.length-1; i++ ){
                if (i%2 == 0){
                    questions.push(q[i])
                }
                else{
                    props = q[i].split('\t')
                    props.pop()
                    proposals.push(props)
                }
            }
            for(let i = 0; i< ans.length-1; i++){
                votes_splitted = ans[i].split('\t')
                votes_splitted.pop()
                votes.push(votes_splitted)
            }
        }
        catch(e){
            console.log(e)
        }

        for (let i = 0; i< questions.length; i++){
            let pq = document.createElement('h3')
            pq.innerHTML = 'Question ' + (i+1).toString() + ': '+ questions[i]
            body.appendChild(pq)               
            for (let j = 0; j < proposals[i].length; j++ ){
                let pp = document.createElement('p')
                pp.innerHTML = 'Proposal ' + (j+1).toString() + ': <br>'+ questions[i] + '<br> Votes: ' + votes[i][j]
                body.appendChild(pp)
            }
            body.appendChild(document.createElement('br'))
        }   

    },

    displayStopVote: () => {
        let button = document.createElement('button');
        button.innerHTML = 'Stop vote'
        button.setAttribute('onClick', "App.stopVote(); return false;")
        button.setAttribute('class', 'btn btn-danger')
        document.getElementById('content').appendChild(button);

    },

    stopVote: async() => {
        await App.voting.endVoting();
        window.location.reload()
    },

    // chairperson create vote form 
    createVote: () => {
        let form = document.createElement("form");
        form.setAttribute('onsubmit', 'App.startVote(); return false;')

        const addQuestionButton = document.createElement('button')
        addQuestionButton.innerHTML = 'Add question'
        addQuestionButton.setAttribute('onClick', "App.addQuestion(this); return false;")
        addQuestionButton.setAttribute('class', 'btn btn-primary')

        const submitButton = document.createElement('button')
        submitButton.setAttribute('type', "submit")
        submitButton.setAttribute('class', 'btn btn-success')
        submitButton.innerHTML = 'Submit'

        form.appendChild(addQuestionButton)
        form.appendChild(document.createElement('br'))
        form.appendChild(document.createElement('br'))
        form.appendChild(submitButton)

        App.addQuestion(addQuestionButton)
        document.getElementById('content').appendChild(form)
    },

    addQuestion: (addQuestionButton) => {
        App.questions += 1
        let questionWrapper = document.createElement('div')

        let question = document.createElement('input');
        question.setAttribute('type', 'text')
        question.setAttribute('placeholder', 'New question')
        question.setAttribute('class', 'form-control')
        question.setAttribute('name', 'Question' + App.questions.toString())

        App.proposals.push(0)
        const addProposalButton = document.createElement('button')
        addProposalButton.setAttribute('onClick', "App.addProposal(this); return false;")
        addProposalButton.setAttribute('name', "proposalButtonQuestion" + App.questions.toString())
        addProposalButton.setAttribute('class', 'btn btn-primary indent')
        addProposalButton.innerHTML = 'Add Proposal'

        questionWrapper.appendChild(question)
        questionWrapper.appendChild(addProposalButton)
        questionWrapper.appendChild(document.createElement('br'))
        questionWrapper.appendChild(document.createElement('br'))
        
        addQuestionButton.parentNode.insertBefore(questionWrapper, addQuestionButton);

        App.addProposal(addProposalButton)

    },

    addProposal: (addProposalButton) => {
        const question = parseInt(addProposalButton.name.match(/[0-9]+$/)[0]);
        App.proposals[question-1] += 1

        let proposal = document.createElement('input')
        proposal.setAttribute('type', 'text')
        proposal.setAttribute('placeholder', 'New proposal')
        proposal.setAttribute('class', 'form-control indent')
        proposal.setAttribute('name', 'Question' + App.questions.toString() + 'Proposal' + App.proposals[question-1].toString() )

        addProposalButton.parentNode.insertBefore(proposal, addProposalButton);

    },

    startVote: async () => {
        const items = $('form').serializeArray()
        for (const item of items){
            if(!item.name.includes('Proposal')){
                await App.voting.addQuestion(item.value)
            }
        }
        for (const item of items){
            if(item.name.includes('Proposal')){
                question = item.name.replace(/\D+/g, ' ').trim().split(' ').map(e => parseInt(e))[0]-1;
                await App.voting.addProposal(question, item.value)
            }
        }
        await App.voting.startVoting();
        
        window.location.reload()
    },

    renderTasks: async () => {
        // Load the total task count from the blockchain
        const taskCount = await App.todoList.taskCount()
        const $taskTemplate = $('.taskTemplate')
        // Render out each task with a new task template

        for (var i = 1; i <= taskCount; i++) {
            // Fetch the task data from the blockchain
            const task = await App.todoList.tasks(i)
            const taskId = task[0].toNumber()
            const taskContent = task[1]
            const taskCompleted = task[2]

            // Create the html for the task
            const $newTaskTemplate = $taskTemplate.clone()
            $newTaskTemplate.find('.content').html(taskContent)
            $newTaskTemplate.find('input')
                .prop('name', taskId)
                .prop('checked', taskCompleted)
                .on('click', App.toggleCompleted)

            // Put the task in the correct list
            if (taskCompleted) {
                $('#completedTaskList').append($newTaskTemplate)
            } else {
                $('#taskList').append($newTaskTemplate)
            }

            // Show the task
            $newTaskTemplate.show()
        }
    },

    setLoading: (boolean) => {
        App.loading = boolean
        const loader = $('#loader')
        const content = $('#content')
        if (boolean) {
            loader.show()
            content.hide()
        } else {
            loader.hide()
            content.show()
        }
    }
}

$(() => {
    $(window).load(() => {
        App.load()
    })
})