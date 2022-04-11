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

        setTimeout( async () => {
            await App.renderVotes();   
            App.setLoading(false);
        }, 1000)

    },

    renderVotes: async () => {
        const isChairperson = await App.voting.isChairperson()
        const voteStarted = await App.voting.hasVoteStarted()
        const voteEnded = await App.voting.hasVoteEnded()
        
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
            if(voteEnded){
                App.displayResults()
            }
            else if(voteStarted){
                if( await App.voting.hasVoted()){
                    let p = document.createElement('p')
                    p.innerHTML = 'You voted!'
                    body.append(p)
                }
                else{
                    App.vote()
                }
            }
            else{
                let p = document.createElement('p')
                p.innerHTML = 'Voting has not yet started'
                body.append(p)
            }
        }
    },

    vote: async() => {
        const body = document.getElementById('content')
        questions = []
        proposals = []
        try{
            const q = (await App.voting.getQuestions()).toString().split('\n')
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
        }
        catch(e){
            console.log(e)
        }

        let form = document.createElement('form')
        form.setAttribute('onsubmit', 'App.submitVote(); return false;')

        for (let i = 0; i < questions.length; i++ ){
            let pq = document.createElement('h5')
            pq.innerHTML = 'Question ' + (i+1).toString() + ': '+ questions[i]
            form.appendChild(pq)
            
            for (let j = 0; j < proposals[i].length; j++ ){
                let choice = document.createElement('input')
                choice.setAttribute('type','radio')
                choice.setAttribute('name','Q'+i.toString())
                choice.setAttribute('value',j.toString())
                choice.setAttribute('style', "display: inline-block")

                let text = document.createElement('p')
                text.innerHTML = proposals[i][j] 
                text.setAttribute('style', "display: inline-block")
                form.appendChild(choice)
                form.appendChild(text)
                form.appendChild(document.createElement('br'))
            }
        }
        const submitButton = document.createElement('button')
        submitButton.setAttribute('type', "submit")
        submitButton.setAttribute('class', 'btn btn-success')
        submitButton.innerHTML = 'Submit'

        form.appendChild(submitButton)
        body.appendChild(form)
    },

    submitVote: async() =>{
        const items = $('form').serializeArray()
        res = []
        for (const item of items){
            res.push(parseInt(item.value))
        }
        await App.voting.vote(res)
        window.location.reload()
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
                pp.innerHTML = 'Proposal ' + (j+1).toString() + ': <br>'+ proposals[i][j] + '<br> Votes: ' + votes[i][j]
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