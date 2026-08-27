// Keep all hooks same, replace return with:
  return (
    <div className="relative bg-card/60 backdrop-blur-sm border border-border/50 rounded-[24px] py-4 shadow-sm mx-1">
      <div className="flex items-center justify-between px-4 mb-3">
        <h3 className="text-[13.5px] font-semibold tracking-tight text-foreground">Suggested for you</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted/80" onClick={() => handleScroll("left")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted/80" onClick={() => handleScroll("right")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-3 px-4 overflow-x-auto scrollbar-hide scroll-smooth">
        <AnimatePresence mode="popLayout">
          {filteredSuggestions.map((account) => (
            <motion.div key={account.id} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="shrink-0">
              <Card className="relative w-[132px] p-3 border-border/60 bg-card hover:bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 rounded-[20px] overflow-hidden">
                <button onClick={() => handleDismiss(account.id)} className="absolute top-2 right-2 p-1 rounded-full bg-muted/60 hover:bg-muted transition-colors backdrop-blur-sm">
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
                <div className="flex flex-col items-center cursor-pointer pt-1" onClick={() => navigate(`/profile/${account.id}`)}>
                  <Avatar className="h-[60px] w-[60px] mb-2.5 ring-2 ring-background shadow-sm">
                    <AvatarImage src={account.avatar_url || ""} className="object-cover" />
                    <AvatarFallback className="bg-muted"><UserCircle className="h-7 w-7 text-muted-foreground/60" /></AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1 mb-0.5 max-w-[100px]">
                    <span className="text-[13px] font-semibold truncate tracking-tight">{account.display_name || account.username}</span>
                    {account.is_verified && <VerifiedBadge size="sm" />}
                  </div>
                  <span className="text-[11px] text-muted-foreground truncate max-w-[100px] mb-2">@{account.username}</span>
                  {account.roles && account.roles.length > 0 && <div className="mb-2.5"><UserRoleBadges roles={account.roles as any} size="sm" /></div>}
                </div>
                <Button size="sm" className="w-full rounded-full text-[12px] h-8 font-medium shadow-sm" onClick={() => sendRequestMutation.mutate(account.id)} disabled={sendRequestMutation.isPending}>
                  <UserPlus className="h-3.5 w-3.5 mr-1" strokeWidth={2} />Follow
                </Button>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
