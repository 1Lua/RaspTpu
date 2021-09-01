var getUrlParameter = function getUrlParameter(sParam) {
    var sPageURL = window.location.search.substring(1),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return typeof sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
        }
    }
    return false;
};

$(document).ready(()=>{
    //$(".login100-form-avatar > img:nth-child(1)").hide()
    $("#loading").hide()
    //$("#login_answer").hide()
    let id = getUrlParameter("id")
    $.get("/vkauth/data?id="+id, (data)=>{
        try {
            $(".login100-form-avatar > img:nth-child(1)").attr("src", data.vk_photo)
            //$(".login100-form-avatar > img:nth-child(1)").toggle(150)
            $(".login100-form-title").html(data.vk_name)
        }catch(error){
            
        }
    })

    $(".login100-form-btn").click(()=>{
        let login_data = $("#login_form").serialize()
        let session_id = getUrlParameter("id")
        $("#login_form").hide()
        $("#loading").show(100)
        $.get("/vkauth/login?" + login_data + "&id=" + id, data=>{
            $("#login_form").show()
            $("#loading").hide(100)

            let result = data.result
            switch(result){
                case "success":{
                    $("#login_answer").html("Успешный вход!")
                    $("#login_answer").show()
                    break
                }
                case "err login":{
                    $("#login_answer").html("Вы ввели неверные данные!")
                    $("#login_answer").show()
                    break
                }

                case "no connect":{
                    $("#login_answer").html("Нет соединения с mail2.tpu.ru :(")
                    $("#login_answer").show()
                    break
                }

                case "session outdated":{
                    $("#login_answer").html("Данная сессия устарела")
                    $("#login_answer").show()
                }

                case "invalid session":{
                    $("#login_answer").html("Сессии не существует")
                    $("#login_answer").show()
                }
            }
        })
    })
})